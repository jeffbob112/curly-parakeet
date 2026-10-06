// FIREBASE BACKEND
// Uses Firebase Authentication (login) + Cloud Firestore (database).
//
// Collections:
//   users/{uid}               -> profile + balance + role ('user' | 'admin') + status
//   accounts/{accountNumber}  -> { uid, fullName } public directory used to find transfer recipients
//   transactions/{id}         -> one record per money movement
//
// Money movements use Firestore *transactions* (runTransaction) so the balance and the
// transaction record are written together — either both succeed or neither does.

import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, getFirestore, increment, limit, onSnapshot, orderBy, query,
  runTransaction, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { BankError, applyCustomerMove, applyMove, generateAccountNumber, makeTx, parseAmount, signed } from '../lib/ledger'
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
const auth = getAuth(app)
const db = getFirestore(app)

const userRef = (uid) => doc(db, 'users', uid)
const txCol = collection(db, 'transactions')

// Turns Firebase error codes into friendly messages.
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

// Calls fn(profile) on login/logout AND whenever the user's document changes (e.g. balance).
export function onAuthChange(fn) {
  let unsubDoc = null
  const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
    unsubDoc?.()
    unsubDoc = null
    if (!fbUser) return fn(null)
    unsubDoc = onSnapshot(userRef(fbUser.uid), (snap) => {
      // The doc may not exist for a split second right after registration.
      if (snap.exists()) fn({ uid: snap.id, ...snap.data() })
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
  const accountNumber = generateAccountNumber()
  const now = Date.now()
  const batch = writeBatch(db)
  batch.set(userRef(uid), {
    uid, email: email.toLowerCase(), fullName, phone: phone || '', address: '', role: 'user',
    status: 'active', accountNumber, balance: 0, avatarColor: '#0b2a5b', createdAt: now, updatedAt: now,
  })
  batch.set(doc(db, 'accounts', accountNumber), { uid, fullName })
  await batch.commit()
})

export const login = safe((email, password) => signInWithEmailAndPassword(auth, email, password))
export const logout = () => signOut(auth)
export const resetDemoData = null // only available in demo mode

export const updateProfile = safe(async (uid, { fullName, phone, address, avatarColor }) => {
  const snap = await getDoc(userRef(uid))
  await updateDoc(userRef(uid), { fullName, phone, address, avatarColor, updatedAt: Date.now() })
  await setDoc(doc(db, 'accounts', snap.data().accountNumber), { uid, fullName })
})

export async function listTransactions(uid) {
  try {
    const snap = await getDocs(query(txCol, where('uid', '==', uid)))
    // Sorting in the browser avoids needing a composite index.
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)
  } catch (e) {
    throw friendly(e)
  }
}

async function customerMove(uid, { amount, description, type, direction, category }) {
  const value = parseAmount(amount)
  await runTransaction(db, async (t) => {
    const snap = await t.get(userRef(uid))
    const user = snap.data()
    const balance = applyCustomerMove(user, value, direction)
    t.update(userRef(uid), { balance, updatedAt: Date.now() })
    t.set(doc(txCol), makeTx({ uid, type, direction, amount: value, description, category, balanceAfter: balance }))
  })
}

export const deposit = safe((uid, { amount, description }) =>
  customerMove(uid, { amount, description: description || 'Mobile deposit', type: 'deposit', direction: 'credit', category: 'Deposit' }))

export const withdraw = safe((uid, { amount, description, category }) =>
  customerMove(uid, { amount, description: description || 'Withdrawal', type: 'withdrawal', direction: 'debit', category: category || 'Other' }))

export const payBill = safe((uid, { amount, description, category }) =>
  customerMove(uid, { amount, description, type: 'payment', direction: 'debit', category: category || 'Utilities' }))

export async function lookupAccount(accountNumber) {
  const snap = await getDoc(doc(db, 'accounts', String(accountNumber).trim()))
  return snap.exists() ? { ...snap.data(), accountNumber: snap.id } : null
}

export const transfer = safe(async (uid, { toAccount, amount, description }) => {
  const value = parseAmount(amount)
  const recipient = await lookupAccount(toAccount)
  if (!recipient) throw new BankError('No account found with that number.')
  if (recipient.uid === uid) throw new BankError("You can't transfer to your own account.")
  const note = description || 'Transfer'
  await runTransaction(db, async (t) => {
    const fromSnap = await t.get(userRef(uid))
    const from = fromSnap.data()
    const fromBalance = applyCustomerMove(from, value, 'debit')
    t.update(userRef(uid), { balance: fromBalance, updatedAt: Date.now() })
    t.set(doc(txCol), makeTx({ uid, type: 'transfer_out', direction: 'debit', amount: value, description: note, category: 'Other', counterparty: recipient.fullName, balanceAfter: fromBalance }))
    // Customers can't read someone else's private user doc (security rules), so we
    // atomically increment the recipient's balance. Rules only allow others to *increase* it.
    t.update(userRef(recipient.uid), { balance: increment(value), updatedAt: Date.now() })
    t.set(doc(txCol), makeTx({ uid: recipient.uid, type: 'transfer_in', direction: 'credit', amount: value, description: note, category: 'Transfer', counterparty: from.fullName, balanceAfter: null, createdBy: uid }))
  })
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
  const snap = await getDocs(query(txCol, orderBy('createdAt', 'desc'), limit(1000))).catch((e) => { throw friendly(e) })
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const adminUpdateUser = safe(async (uid, patch) => {
  const allowed = ['fullName', 'phone', 'address', 'avatarColor', 'role', 'status']
  const data = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)))
  await updateDoc(userRef(uid), { ...data, updatedAt: Date.now() })
  if (data.fullName) {
    const u = await getUser(uid)
    await setDoc(doc(db, 'accounts', u.accountNumber), { uid, fullName: data.fullName })
  }
})

export const adminAddTransaction = safe(async (adminUid, uid, { type, direction, amount, description, category, createdAt }) => {
  const value = parseAmount(amount)
  await runTransaction(db, async (t) => {
    const user = (await t.get(userRef(uid))).data()
    const balance = applyMove(user, value, direction)
    t.update(userRef(uid), { balance, updatedAt: Date.now() })
    t.set(doc(txCol), makeTx({ uid, type, direction, amount: value, description, category, balanceAfter: balance, createdAt: createdAt || Date.now(), createdBy: adminUid }))
  })
})

export async function adminSetBalance(adminUid, uid, newBalance) {
  const target = Math.round(Number(newBalance) * 100) / 100
  if (!Number.isFinite(target) || target < 0) throw new BankError('Balance must be 0 or more.')
  const user = await getUser(uid)
  const diff = Math.round((target - user.balance) * 100) / 100
  if (diff === 0) return
  return adminAddTransaction(adminUid, uid, {
    type: 'adjustment', direction: diff > 0 ? 'credit' : 'debit', amount: Math.abs(diff),
    description: 'Balance adjustment by admin', category: 'Other',
  })
}

export const adminUpdateTransaction = safe((txId, { description, category, createdAt, status }) =>
  updateDoc(doc(db, 'transactions', txId), { description, category, createdAt, status }))

export const adminDeleteTransaction = safe(async (txId) => {
  await runTransaction(db, async (t) => {
    const txSnap = await t.get(doc(db, 'transactions', txId))
    if (!txSnap.exists()) throw new BankError('Transaction not found.')
    const tx = txSnap.data()
    const userSnap = await t.get(userRef(tx.uid))
    if (userSnap.exists()) {
      const next = Math.round((userSnap.data().balance - signed(tx)) * 100) / 100
      if (next < 0) throw new BankError('Deleting this would make the balance negative.')
      t.update(userRef(tx.uid), { balance: next, updatedAt: Date.now() })
    }
    t.delete(txSnap.ref)
  })
})

export const adminGenerateHistory = safe(async (adminUid, uid, months = 6) => {
  const user = await getUser(uid)
  let balance = user.balance
  const batch = writeBatch(db)
  for (const it of generateHistory({ months, startBalance: balance })) {
    try { balance = applyMove({ balance }, it.amount, it.direction) } catch { continue }
    batch.set(doc(txCol), makeTx({ ...it, uid, balanceAfter: balance, createdBy: adminUid }))
  }
  batch.update(userRef(uid), { balance, updatedAt: Date.now() })
  await batch.commit()
})
