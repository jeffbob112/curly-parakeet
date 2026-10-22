// FIREBASE BACKEND
// Uses Firebase Authentication (login) + Cloud Firestore (database).
//
// Collections:
//   users/{uid}               -> profile, role, status and an `accounts` map
//                                { chk: {number, balance, openedAt, ...}, sav: {...}, cc: {...}, ... }
//   accounts/{accountNumber}  -> { uid, fullName, accountId } public directory used to find transfer recipients
//   transactions/{id}         -> one record per money movement (has uid + accountId)
//
// Money movements run inside Firestore *transactions* (runTransaction): the balance
// and the transaction records are written together — all succeed or none do.

import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence, connectAuthEmulator, createUserWithEmailAndPassword, indexedDBLocalPersistence, initializeAuth,
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'firebase/auth'
import {
  collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, increment, limit, onSnapshot, orderBy, query,
  runTransaction, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { accountList, newAccount } from '../lib/accounts'
import { BankError, applyMove, makeTx } from '../lib/ledger'
import * as ops from '../lib/operations'
import { generateHistory } from '../lib/sampleData'
import { emitDataChange } from './events'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})
// initializeAuth (instead of getAuth) skips the Google sign-in popup helper we don't use.
const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
const db = getFirestore(app)

// `npm run emulators` runs Firebase on your own computer for safe testing.
if (import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

const userRef = (uid) => doc(db, 'users', uid)
const txCol = collection(db, 'transactions')
const dirRef = (number) => doc(db, 'accounts', String(number))

function friendly(err) {
  const map = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'permission-denied': "You don't have permission to do that.",
  }
  if (err instanceof BankError) return err
  return new BankError(map[err.code] || err.message)
}
const safe = (fn) => async (...args) => {
  try {
    const result = await fn(...args)
    emitDataChange()
    return result
  } catch (e) {
    throw friendly(e)
  }
}

export const mode = 'firebase'

// Calls fn(profile) on login/logout AND whenever the user's document changes (e.g. a balance).
export function onAuthChange(fn) {
  let unsubDoc = null
  const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
    unsubDoc?.()
    unsubDoc = null
    if (!fbUser) return fn(null)
    unsubDoc = onSnapshot(userRef(fbUser.uid), (snap) => {
      if (snap.exists()) fn({ uid: snap.id, ...snap.data() }) // may not exist for a moment right after sign-up
    }, () => fn(null))
  })
  return () => {
    unsubDoc?.()
    unsubAuth()
  }
}

export const register = safe(async ({ fullName, email, password, phone }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid = cred.user.uid
  const now = Date.now()
  const accounts = { chk: newAccount('chk'), sav: newAccount('sav') }
  const profile = {
    uid, email: email.toLowerCase(), fullName, phone: phone || '', address: '', role: 'user', status: 'active',
    avatarColor: '#0b2a5b', memberSince: now, createdAt: now, updatedAt: now, accounts,
  }
  const batch = writeBatch(db)
  batch.set(userRef(uid), profile)
  for (const a of Object.values(accounts)) batch.set(dirRef(a.number), { uid, fullName, accountId: a.id })
  await batch.commit()
  return profile
})

export const login = safe(async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const snap = await getDoc(userRef(cred.user.uid))
  return { uid: snap.id, ...snap.data() }
})
export const logout = () => signOut(auth)
export const resetDemoData = null // demo mode only

// ---------- shared runner ----------
// Runs a pure operation from lib/operations.js inside a Firestore transaction.
async function run(uid, fn) {
  return runTransaction(db, async (t) => {
    const snap = await t.get(userRef(uid))
    if (!snap.exists()) throw new BankError('Profile not found.')
    const copy = ops.cloneUser({ uid, ...snap.data() })
    const result = fn(copy) || { txs: [] }
    t.set(userRef(uid), { ...copy, updatedAt: Date.now() })
    for (const tx of result.txs) t.set(doc(txCol), tx)
    if (result.credit) {
      // Customers can't read someone else's private doc, so we increment the recipient's
      // balance. Security rules only let other people INCREASE checking/savings balances.
      const { uid: rid, accountId, amount, tx } = result.credit
      t.update(userRef(rid), { [`accounts.${accountId}.balance`]: increment(amount), updatedAt: Date.now() })
      t.set(doc(txCol), tx)
    }
    return result.txs
  })
}

// ---------- customer ----------
export async function listTransactions(uid) {
  try {
    const snap = await getDocs(query(txCol, where('uid', '==', uid)))
    // Sorting in the browser avoids needing a composite index.
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)
  } catch (e) {
    throw friendly(e)
  }
}

export const updateProfile = safe(async (uid, { fullName, phone, address, avatarColor }) => {
  const u = (await getDoc(userRef(uid))).data()
  await updateDoc(userRef(uid), { fullName, phone, address, avatarColor, updatedAt: Date.now() })
  for (const a of accountList(u).filter((x) => x.id === 'chk' || x.id === 'sav')) await setDoc(dirRef(a.number), { uid, fullName, accountId: a.id })
})

export async function lookupAccount(accountNumber) {
  const snap = await getDoc(dirRef(String(accountNumber).trim()))
  return snap.exists() ? { ...snap.data(), accountNumber: snap.id } : null
}

export const deposit = safe(async (uid, input) => {
  const monthUsed = ops.checkDepositUsed(await listTransactions(uid), input.accountId || 'chk')
  return run(uid, (u) => ops.opDeposit(u, { ...input, monthUsed }))
})
export const withdraw = safe((uid, input) => run(uid, (u) => ops.opWithdraw(u, input)))
export const payBill = safe((uid, input) => run(uid, (u) => ops.opPayBill(u, input)))
export const transferInternal = safe((uid, input) => run(uid, (u) => ops.opInternalTransfer(u, input)))
export const wire = safe((uid, input) => run(uid, (u) => ops.opWire(u, input)))
export const trade = safe((uid, input) => run(uid, (u) => ops.opTrade(u, input)))
export const sendMoney = safe(async (uid, { toAccount, ...input }) => {
  const recipient = await lookupAccount(toAccount)
  return run(uid, (u) => ops.opSend(u, recipient, input))
})
export const openAccount = safe(async (uid, accountId) => {
  await run(uid, (u) => ops.opOpenAccount(u, accountId))
  if (accountId === 'chk' || accountId === 'sav') {
    const u = (await getDoc(userRef(uid))).data()
    await setDoc(dirRef(u.accounts[accountId].number), { uid, fullName: u.fullName, accountId })
  }
})

// ---------- admin ----------
export async function listUsers() {
  const snap = await getDocs(collection(db, 'users')).catch((e) => { throw friendly(e) })
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getUser(uid) {
  const snap = await getDoc(userRef(uid))
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null
}

export async function listAllTransactions() {
  const snap = await getDocs(query(txCol, orderBy('createdAt', 'desc'), limit(2000))).catch((e) => { throw friendly(e) })
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const adminUpdateUser = safe(async (uid, patch) => {
  const allowed = ['fullName', 'phone', 'address', 'avatarColor', 'role', 'status', 'memberSince']
  const data = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)))
  await updateDoc(userRef(uid), { ...data, updatedAt: Date.now() })
  if (data.fullName) {
    const u = await getUser(uid)
    for (const a of accountList(u).filter((x) => x.id === 'chk' || x.id === 'sav')) await setDoc(dirRef(a.number), { uid, fullName: data.fullName, accountId: a.id })
  }
})
export const adminAddTransaction = safe((adminUid, uid, input) => run(uid, (u) => ops.opAdminTransaction(u, adminUid, input)))
export const adminSetBalance = safe((adminUid, uid, accountId, value) => run(uid, (u) => ops.opAdminSetBalance(u, adminUid, accountId, value)))
export const adminUpdateAccount = safe(async (uid, accountId, patch) => {
  await run(uid, (u) => ops.opAdminUpdateAccount(u, accountId, patch))
  const u = await getUser(uid)
  const acc = u.accounts?.[accountId]
  if (acc && acc.status === 'open' && (accountId === 'chk' || accountId === 'sav')) await setDoc(dirRef(acc.number), { uid, fullName: u.fullName, accountId })
})

export const adminUpdateTransaction = safe((txId, { description, category, createdAt, status, counterparty }) =>
  updateDoc(doc(db, 'transactions', txId), { description, category, createdAt, status, counterparty }))

export const adminDeleteTransaction = safe(async (txId) => {
  await runTransaction(db, async (t) => {
    const txSnap = await t.get(doc(db, 'transactions', txId))
    if (!txSnap.exists()) throw new BankError('Transaction not found.')
    const tx = txSnap.data()
    const userSnap = await t.get(userRef(tx.uid))
    if (userSnap.exists()) {
      const u = ops.cloneUser(userSnap.data())
      ops.reverseTx(u, tx)
      t.update(userRef(tx.uid), { accounts: u.accounts, updatedAt: Date.now() })
    }
    t.delete(txSnap.ref)
  })
})

export const adminGenerateHistory = safe(async (adminUid, uid, months = 6) => {
  const u = await getUser(uid)
  const { accounts, balances } = ops.prepareHistory(u, months, { backdate: true })
  const txs = []
  for (const item of generateHistory({ months, accounts, balances })) {
    const copy = ops.cloneUser(u)
    try {
      const legs = item.legs.map((l) => {
        const acc = copy.accounts[l.accountId]
        acc.balance = applyMove(acc, l.amount, l.direction)
        return makeTx({ uid, ...l, balanceAfter: acc.balance, createdAt: item.createdAt, createdBy: adminUid })
      })
      u.accounts = copy.accounts
      txs.push(...legs)
    } catch { /* skip */ }
  }
  // Firestore batches hold up to 500 writes.
  for (let i = 0; i < txs.length; i += 450) {
    const batch = writeBatch(db)
    txs.slice(i, i + 450).forEach((tx) => batch.set(doc(txCol), tx))
    if (i + 450 >= txs.length) batch.update(userRef(uid), { accounts: u.accounts, memberSince: u.memberSince, updatedAt: Date.now() })
    await batch.commit()
  }
  if (!txs.length) await updateDoc(userRef(uid), { accounts: u.accounts, memberSince: u.memberSince, updatedAt: Date.now() })
})
