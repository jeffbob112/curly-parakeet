// The "rules of money" for the app. Both backends (demo + Firebase) use these
// functions so the business logic lives in ONE place.

import { MAX_SINGLE_TRANSACTION } from './constants'

export class BankError extends Error {}

export function parseAmount(value) {
  const amount = Math.round(Number(value) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) throw new BankError('Enter an amount greater than $0.')
  return amount
}

// Validates a customer-initiated movement and returns the new balance.
export function applyCustomerMove(user, amount, direction) {
  if (user.status === 'frozen') throw new BankError('This account is frozen. Please contact support.')
  if (amount > MAX_SINGLE_TRANSACTION) {
    throw new BankError(`The limit per transaction is $${MAX_SINGLE_TRANSACTION.toLocaleString()}.`)
  }
  return applyMove(user, amount, direction)
}

// Admin movements skip the limits but still can't make a balance negative.
export function applyMove(user, amount, direction) {
  const next = direction === 'credit' ? user.balance + amount : user.balance - amount
  if (next < 0) throw new BankError('Insufficient funds.')
  return Math.round(next * 100) / 100
}

export function generateAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 9000000000))
}

// Builds a transaction record (without id).
export function makeTx({
  uid, type, direction, amount, description, category = 'Other', counterparty = '',
  balanceAfter, createdAt = Date.now(), createdBy, status = 'completed',
}) {
  return {
    uid, type, direction, amount, description: description || '', category, counterparty,
    balanceAfter, createdAt, createdBy: createdBy || uid, status,
  }
}

// Sum of signed amounts, used when reversing / recalculating.
export const signed = (tx) => (tx.direction === 'credit' ? tx.amount : -tx.amount)
