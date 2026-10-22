// DEMO BACKEND
// Stores everything in localStorage so the app works with zero setup.
// It exposes exactly the same functions as firebaseBackend.js.
// NOTE: passwords are stored in plain text here. That's OK for a local demo,
// but NEVER do this in a real app (Firebase Auth handles it for you).

import { accountList, newAccount } from '../lib/accounts'
import { BankError, applyMove, makeTx } from '../lib/ledger'
import * as ops from '../lib/operations'
import { generateHistory, sampleHoldings } from '../lib/sampleData'
import { emitDataChange } from './events'

const DB_KEY = 'parakeet_db_v2'
const SESSION_KEY = 'parakeet_session_v2'
const DAY = 86400000
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms)) // feels like a network call
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* broken storage -> reseed */ }
  const db = seed()
  save(db)
  return db
}
function save(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    throw new BankError('Browser storage is full. Try smaller check photos, or reset the demo data.')
  }
}

function newUser({ uid, email, password, fullName, phone = '', role = 'user', memberSince = Date.now(), accounts = { chk: {}, sav: {} } }) {
  return {
    uid, email: email.toLowerCase(), password, fullName, phone, address: '', role, status: 'active',
    avatarColor: '#0b2a5b', memberSince, createdAt: memberSince, updatedAt: Date.now(),
    accounts: Object.fromEntries(Object.entries(accounts).map(([k, v]) => [k, newAccount(k, { openedAt: memberSince, ...v })])),
  }
}

function seed() {
  const now = Date.now()
  const db = { users: {}, transactions: [] }
  db.users.admin = newUser({ uid: 'admin', email: 'admin@parakeet.bank', password: 'admin123', fullName: 'Ada Admin', role: 'admin', accounts: { chk: {} } })

  const janeSince = now - 38 * 30 * DAY
  db.users.jane = newUser({
    uid: 'jane', email: 'jane@parakeet.bank', password: 'demo123', fullName: 'Jane Cooper', phone: '(555) 123-4567', memberSince: janeSince,
    accounts: {
      chk: {}, sav: {},
      cc: { openedAt: now - 26 * 30 * DAY, creditLimit: 8000 },
      heloc: { openedAt: now - 18 * 30 * DAY, creditLimit: 25000 },
      inv: { openedAt: now - 14 * 30 * DAY, holdings: sampleHoldings() },
    },
  })
  db.users.jane.address = '42 Maple Street, Springfield'
  openingDeposits(db, 'jane', { chk: 3200, sav: 6000 }, janeSince)
  addBulk(db, 'jane', 24, 'admin')

  const johnSince = now - 9 * 30 * DAY
  db.users.john = newUser({
    uid: 'john', email: 'john@parakeet.bank', password: 'demo123', fullName: 'John Smith', phone: '(555) 987-6543', memberSince: johnSince,
    accounts: { chk: {}, sav: {}, cc: { openedAt: johnSince, creditLimit: 3000 } },
  })
  openingDeposits(db, 'john', { chk: 1500, sav: 1000 }, johnSince)
  addBulk(db, 'john', 8, 'admin')
  return db
}

function openingDeposits(db, uid, amounts, at) {
  const u = db.users[uid]
  for (const [accountId, amount] of Object.entries(amounts)) {
    u.accounts[accountId].balance += amount
    db.transactions.push({ id: id(), ...makeTx({ uid, accountId, type: 'deposit', direction: 'credit', amount, description: 'Opening deposit', category: 'Deposit', balanceAfter: u.accounts[accountId].balance, createdAt: at + 3600000, createdBy: 'admin' }) })
  }
}

// Applies generated history to a user, item by item (skips any that no longer fit).
function addBulk(db, uid, months, createdBy, backdate = false) {
  const u = db.users[uid]
  const { accounts, balances } = ops.prepareHistory(u, months, { backdate })
  for (const item of generateHistory({ months, accounts, balances })) {
    const copy = ops.cloneUser(u)
    try {
      const txs = item.legs.map((l) => {
        const acc = copy.accounts[l.accountId]
        acc.balance = applyMove(acc, l.amount, l.direction)
        return makeTx({ uid, ...l, balanceAfter: acc.balance, createdAt: item.createdAt, createdBy })
      })
      u.accounts = copy.accounts
      db.transactions.push(...txs.map((t) => ({ id: id(), ...t })))
    } catch { /* skip */ }
  }
  u.updatedAt = Date.now()
}

const publicUser = (u) => {
  if (!u) return null
  const { password: _pw, ...rest } = u
  return rest
}

// ---------- auth ----------
const authListeners = new Set()
function currentUser() {
  const uid = localStorage.getItem(SESSION_KEY)
  return uid ? publicUser(load().users[uid]) : null
}
function notifyAuth() {
  const user = currentUser()
  authListeners.forEach((fn) => fn(user))
}
function commit(db) {
  save(db)
  notifyAuth()
  emitDataChange()
}

export const mode = 'demo'

export function onAuthChange(fn) {
  authListeners.add(fn)
  setTimeout(() => fn(currentUser()), 0)
  const onStorage = (e) => (e.key === DB_KEY || e.key === SESSION_KEY) && (notifyAuth(), emitDataChange())
  window.addEventListener('storage', onStorage) // keep several tabs in sync
  return () => {
    authListeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

export async function register({ fullName, email, password, phone }) {
  await wait()
  const db = load()
  if (Object.values(db.users).some((u) => u.email === email.toLowerCase())) throw new BankError('An account with this email already exists.')
  if (password.length < 6) throw new BankError('Password must be at least 6 characters.')
  const uid = id()
  db.users[uid] = newUser({ uid, email, password, fullName, phone })
  localStorage.setItem(SESSION_KEY, uid)
  commit(db)
  return publicUser(db.users[uid])
}

export async function login(email, password) {
  await wait()
  const db = load()
  const user = Object.values(db.users).find((u) => u.email === email.toLowerCase())
  if (!user || user.password !== password) throw new BankError('Incorrect email or password.')
  localStorage.setItem(SESSION_KEY, user.uid)
  notifyAuth()
  return publicUser(user)
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY)
  notifyAuth()
}

export async function resetDemoData() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(SESSION_KEY)
  load()
  notifyAuth()
  emitDataChange()
}

// ---------- shared runner ----------
// Runs a pure operation from lib/operations.js against a copy of the user,
// then saves the user, the new transactions, and any money sent to someone else.
async function run(uid, fn) {
  await wait()
  const db = load()
  const user = db.users[uid]
  if (!user) throw new BankError('Profile not found.')
  const copy = ops.cloneUser(user)
  const result = fn(copy, db) || { txs: [] }
  if (result.credit) {
    const r = db.users[result.credit.uid]
    const acc = r?.accounts?.[result.credit.accountId]
    if (!acc || acc.status === 'closed') throw new BankError('The recipient account cannot receive money right now.')
    if (r.status === 'frozen') throw new BankError('The recipient account cannot receive money right now.')
    acc.balance = applyMove(acc, result.credit.amount, 'credit')
    r.updatedAt = Date.now()
    db.transactions.push({ id: id(), ...result.credit.tx, balanceAfter: acc.balance })
  }
  db.users[uid] = { ...copy, password: user.password, updatedAt: Date.now() }
  db.transactions.push(...result.txs.map((t) => ({ id: id(), ...t })))
  commit(db)
  return result.txs
}

// ---------- customer ----------
export async function listTransactions(uid) {
  await wait(120)
  return load().transactions.filter((t) => t.uid === uid).sort((a, b) => b.createdAt - a.createdAt)
}

export async function updateProfile(uid, { fullName, phone, address, avatarColor }) {
  return run(uid, (u) => { Object.assign(u, { fullName, phone, address, avatarColor }) })
}

export async function lookupAccount(accountNumber) {
  await wait(120)
  const num = String(accountNumber).trim()
  for (const u of Object.values(load().users)) {
    for (const a of accountList(u)) {
      if (a.number === num && (a.id === 'chk' || a.id === 'sav')) return { uid: u.uid, fullName: u.fullName, accountNumber: a.number, accountId: a.id }
    }
  }
  return null
}

export const deposit = (uid, input) => run(uid, (u, db) =>
  ops.opDeposit(u, { ...input, monthUsed: ops.checkDepositUsed(db.transactions.filter((t) => t.uid === uid), input.accountId || 'chk') }))
export const withdraw = (uid, input) => run(uid, (u) => ops.opWithdraw(u, input))
export const payBill = (uid, input) => run(uid, (u) => ops.opPayBill(u, input))
export const transferInternal = (uid, input) => run(uid, (u) => ops.opInternalTransfer(u, input))
export const wire = (uid, input) => run(uid, (u) => ops.opWire(u, input))
export const trade = (uid, input) => run(uid, (u) => ops.opTrade(u, input))
export const openAccount = (uid, accountId) => run(uid, (u) => ops.opOpenAccount(u, accountId))
export async function sendMoney(uid, { toAccount, ...input }) {
  const recipient = await lookupAccount(toAccount)
  return run(uid, (u) => ops.opSend(u, recipient, input))
}

// ---------- admin ----------
export async function listUsers() {
  await wait(120)
  return Object.values(load().users).map(publicUser).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getUser(uid) {
  await wait(80)
  return publicUser(load().users[uid])
}

export async function listAllTransactions() {
  await wait(120)
  return load().transactions.sort((a, b) => b.createdAt - a.createdAt)
}

export const adminUpdateUser = (uid, patch) => run(uid, (u) => {
  for (const k of ['fullName', 'phone', 'address', 'avatarColor', 'role', 'status', 'memberSince']) if (k in patch) u[k] = patch[k]
})
export const adminAddTransaction = (adminUid, uid, input) => run(uid, (u) => ops.opAdminTransaction(u, adminUid, input))
export const adminSetBalance = (adminUid, uid, accountId, value) => run(uid, (u) => ops.opAdminSetBalance(u, adminUid, accountId, value))
export const adminUpdateAccount = (uid, accountId, patch) => run(uid, (u) => ops.opAdminUpdateAccount(u, accountId, patch))

export async function adminUpdateTransaction(txId, { description, category, createdAt, status, counterparty }) {
  await wait()
  const db = load()
  const tx = db.transactions.find((t) => t.id === txId)
  if (!tx) throw new BankError('Transaction not found.')
  Object.assign(tx, { description, category, createdAt, status, counterparty })
  commit(db)
}

// Deleting reverses the transaction's effect on the balance, so everything stays consistent.
export async function adminDeleteTransaction(txId) {
  await wait()
  const db = load()
  const tx = db.transactions.find((t) => t.id === txId)
  if (!tx) throw new BankError('Transaction not found.')
  const u = db.users[tx.uid]
  if (u) {
    ops.reverseTx(u, tx)
    u.updatedAt = Date.now()
  }
  db.transactions = db.transactions.filter((t) => t.id !== txId)
  commit(db)
}

export async function adminGenerateHistory(adminUid, uid, months = 6) {
  await wait()
  const db = load()
  if (!db.users[uid]) throw new BankError('Profile not found.')
  addBulk(db, uid, months, adminUid, true)
  commit(db)
}
