// DEMO BACKEND
// Stores everything in localStorage so the app works with zero setup.
// It implements exactly the same functions as firebaseBackend.js.
// NOTE: passwords are stored in plain text here. That is fine for a local
// demo, but NEVER do this in a real app (Firebase Auth handles it for you).

import { BankError, applyCustomerMove, applyMove, generateAccountNumber, makeTx, parseAmount, signed } from '../lib/ledger'
import { generateHistory } from '../lib/sampleData'
import { emitDataChange } from './events'

const DB_KEY = 'parakeet_db_v1'
const SESSION_KEY = 'parakeet_session_v1'
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms)) // feels like a network call
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore broken storage */ }
  const db = seed()
  save(db)
  return db
}
function save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function newUser({ uid, email, password, fullName, phone = '', role = 'user' }) {
  return {
    uid, email: email.toLowerCase(), password, fullName, phone, address: '', role,
    status: 'active', accountNumber: generateAccountNumber(), balance: 0,
    avatarColor: '#0b2a5b', createdAt: Date.now(), updatedAt: Date.now(),
  }
}

function seed() {
  const db = { users: {}, transactions: [] }
  db.users.admin = newUser({ uid: 'admin', email: 'admin@parakeet.bank', password: 'admin123', fullName: 'Ada Admin', role: 'admin' })
  db.users.jane = newUser({ uid: 'jane', email: 'jane@parakeet.bank', password: 'demo123', fullName: 'Jane Cooper', phone: '(555) 123-4567' })
  db.users.jane.address = '42 Maple Street, Springfield'
  db.users.john = newUser({ uid: 'john', email: 'john@parakeet.bank', password: 'demo123', fullName: 'John Smith', phone: '(555) 987-6543' })
  addBulk(db, 'jane', generateHistory({ months: 6 }), 'admin')
  addBulk(db, 'john', generateHistory({ months: 3 }), 'admin')
  return db
}

// Applies many sample transactions to a user, oldest first.
function addBulk(db, uid, items, createdBy) {
  const user = db.users[uid]
  for (const it of [...items].sort((a, b) => a.createdAt - b.createdAt)) {
    let balanceAfter
    try { balanceAfter = applyMove(user, it.amount, it.direction) } catch { continue } // skip if it would go negative
    user.balance = balanceAfter
    db.transactions.push({ id: id(), ...makeTx({ ...it, uid, balanceAfter, createdBy }) })
  }
  user.updatedAt = Date.now()
}

const publicUser = (u) => {
  if (!u) return null
  const { password: _password, ...rest } = u
  return rest
}

// ---------- auth ----------
const authListeners = new Set()
function notifyAuth() {
  const uid = localStorage.getItem(SESSION_KEY)
  const db = load()
  const user = uid ? publicUser(db.users[uid]) : null
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
  setTimeout(notifyAuth, 0)
  // keep multiple tabs in sync
  const onStorage = (e) => (e.key === DB_KEY || e.key === SESSION_KEY) && (notifyAuth(), emitDataChange())
  window.addEventListener('storage', onStorage)
  return () => {
    authListeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

export async function register({ fullName, email, password, phone }) {
  await wait()
  const db = load()
  if (Object.values(db.users).some((u) => u.email === email.toLowerCase())) {
    throw new BankError('An account with this email already exists.')
  }
  if (password.length < 6) throw new BankError('Password must be at least 6 characters.')
  const uid = id()
  db.users[uid] = newUser({ uid, email, password, fullName, phone })
  localStorage.setItem(SESSION_KEY, uid)
  commit(db)
}

export async function login(email, password) {
  await wait()
  const db = load()
  const user = Object.values(db.users).find((u) => u.email === email.toLowerCase())
  if (!user || user.password !== password) throw new BankError('Incorrect email or password.')
  localStorage.setItem(SESSION_KEY, user.uid)
  notifyAuth()
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

// ---------- customer ----------
function getUserOrThrow(db, uid) {
  const u = db.users[uid]
  if (!u) throw new BankError('Account not found.')
  return u
}

export async function updateProfile(uid, { fullName, phone, address, avatarColor }) {
  await wait()
  const db = load()
  const u = getUserOrThrow(db, uid)
  Object.assign(u, { fullName, phone, address, avatarColor, updatedAt: Date.now() })
  commit(db)
}

export async function listTransactions(uid) {
  await wait(150)
  return load().transactions.filter((t) => t.uid === uid).sort((a, b) => b.createdAt - a.createdAt)
}

async function customerMove(uid, { amount, description, type, direction, category }) {
  await wait()
  const db = load()
  const u = getUserOrThrow(db, uid)
  const value = parseAmount(amount)
  u.balance = applyCustomerMove(u, value, direction)
  u.updatedAt = Date.now()
  const tx = { id: id(), ...makeTx({ uid, type, direction, amount: value, description, category, balanceAfter: u.balance }) }
  db.transactions.push(tx)
  commit(db)
  return tx
}

export const deposit = (uid, { amount, description }) =>
  customerMove(uid, { amount, description: description || 'Mobile deposit', type: 'deposit', direction: 'credit', category: 'Deposit' })

export const withdraw = (uid, { amount, description, category }) =>
  customerMove(uid, { amount, description: description || 'Withdrawal', type: 'withdrawal', direction: 'debit', category: category || 'Other' })

export const payBill = (uid, { amount, description, category }) =>
  customerMove(uid, { amount, description, type: 'payment', direction: 'debit', category: category || 'Utilities' })

export async function lookupAccount(accountNumber) {
  await wait(150)
  const u = Object.values(load().users).find((x) => x.accountNumber === String(accountNumber).trim())
  return u ? { uid: u.uid, fullName: u.fullName, accountNumber: u.accountNumber } : null
}

export async function transfer(uid, { toAccount, amount, description }) {
  await wait()
  const db = load()
  const from = getUserOrThrow(db, uid)
  const to = Object.values(db.users).find((x) => x.accountNumber === String(toAccount).trim())
  if (!to) throw new BankError('No account found with that number.')
  if (to.uid === uid) throw new BankError("You can't transfer to your own account.")
  if (to.status === 'frozen') throw new BankError('The recipient account cannot receive funds right now.')
  const value = parseAmount(amount)
  from.balance = applyCustomerMove(from, value, 'debit')
  to.balance = applyMove(to, value, 'credit')
  from.updatedAt = to.updatedAt = Date.now()
  const note = description || 'Transfer'
  db.transactions.push(
    { id: id(), ...makeTx({ uid, type: 'transfer_out', direction: 'debit', amount: value, description: note, category: 'Other', counterparty: to.fullName, balanceAfter: from.balance }) },
    { id: id(), ...makeTx({ uid: to.uid, type: 'transfer_in', direction: 'credit', amount: value, description: note, category: 'Transfer', counterparty: from.fullName, balanceAfter: to.balance, createdBy: uid }) },
  )
  commit(db)
}

// ---------- admin ----------
export async function listUsers() {
  await wait(150)
  return Object.values(load().users).map(publicUser).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getUser(uid) {
  await wait(100)
  return publicUser(load().users[uid])
}

export async function listAllTransactions() {
  await wait(150)
  return load().transactions.sort((a, b) => b.createdAt - a.createdAt)
}

// Admin can edit profile fields, role and status (not balance directly — use adjustBalance).
export async function adminUpdateUser(uid, patch) {
  await wait()
  const db = load()
  const u = getUserOrThrow(db, uid)
  const allowed = ['fullName', 'phone', 'address', 'avatarColor', 'role', 'status']
  for (const k of allowed) if (k in patch) u[k] = patch[k]
  u.updatedAt = Date.now()
  commit(db)
}

// Credit or debit a user and record it, optionally backdated.
export async function adminAddTransaction(adminUid, uid, { type, direction, amount, description, category, createdAt }) {
  await wait()
  const db = load()
  const u = getUserOrThrow(db, uid)
  const value = parseAmount(amount)
  u.balance = applyMove(u, value, direction)
  u.updatedAt = Date.now()
  db.transactions.push({
    id: id(),
    ...makeTx({ uid, type, direction, amount: value, description, category, balanceAfter: u.balance, createdAt: createdAt || Date.now(), createdBy: adminUid }),
  })
  commit(db)
}

// Set the balance to an exact number by recording an adjustment for the difference.
export async function adminSetBalance(adminUid, uid, newBalance) {
  const db = load()
  const u = getUserOrThrow(db, uid)
  const target = Math.round(Number(newBalance) * 100) / 100
  if (!Number.isFinite(target) || target < 0) throw new BankError('Balance must be 0 or more.')
  const diff = Math.round((target - u.balance) * 100) / 100
  if (diff === 0) return
  return adminAddTransaction(adminUid, uid, {
    type: 'adjustment', direction: diff > 0 ? 'credit' : 'debit', amount: Math.abs(diff),
    description: 'Balance adjustment by admin', category: diff > 0 ? 'Other' : 'Other',
  })
}

export async function adminUpdateTransaction(txId, { description, category, createdAt, status }) {
  await wait()
  const db = load()
  const tx = db.transactions.find((t) => t.id === txId)
  if (!tx) throw new BankError('Transaction not found.')
  Object.assign(tx, { description, category, createdAt, status })
  commit(db)
}

// Deleting a transaction reverses its effect on the balance so everything stays consistent.
export async function adminDeleteTransaction(txId) {
  await wait()
  const db = load()
  const tx = db.transactions.find((t) => t.id === txId)
  if (!tx) throw new BankError('Transaction not found.')
  const u = db.users[tx.uid]
  if (u) {
    const next = Math.round((u.balance - signed(tx)) * 100) / 100
    if (next < 0) throw new BankError('Deleting this would make the balance negative.')
    u.balance = next
    u.updatedAt = Date.now()
  }
  db.transactions = db.transactions.filter((t) => t.id !== txId)
  commit(db)
}

export async function adminGenerateHistory(adminUid, uid, months = 6) {
  await wait()
  const db = load()
  const u = getUserOrThrow(db, uid)
  addBulk(db, uid, generateHistory({ months, startBalance: u.balance }), adminUid)
  commit(db)
}
