// The "rules of money". Both backends use these, so the logic lives in ONE place.

import { ACCOUNT_TYPES, isLiability } from './accounts'
import { MAX_SINGLE_TRANSACTION } from './constants'

export class BankError extends Error {}

export const round2 = (n) => Math.round(n * 100) / 100

export function parseAmount(value) {
  const amount = round2(Number(value))
  if (!Number.isFinite(amount) || amount <= 0) throw new BankError('Enter an amount greater than $0.')
  return amount
}

/**
 * Applies one movement to an account and returns the new balance.
 *  - asset account:      credit = +money, debit = -money (can't go below $0)
 *  - liability account:  debit = you owe more (can't pass the credit limit),
 *                        credit = a payment (can't pay more than you owe)
 */
export function applyMove(acc, amount, direction) {
  const name = ACCOUNT_TYPES[acc.id]?.label || 'account'
  if (acc.status === 'closed') throw new BankError(`Your ${name} is closed.`)
  if (isLiability(acc)) {
    const next = direction === 'debit' ? acc.balance + amount : acc.balance - amount
    if (next > (acc.creditLimit || 0) + 0.001) throw new BankError(`That's more than the available credit on your ${name}.`)
    if (next < -0.001) throw new BankError(`That's more than you owe on your ${name}.`)
    return round2(next)
  }
  const next = direction === 'credit' ? acc.balance + amount : acc.balance - amount
  if (next < -0.001) throw new BankError(`Insufficient funds in your ${name}.`)
  return round2(next)
}

// Customer-initiated: also checks frozen status and the per-transaction limit.
export function checkCustomer(user, amount) {
  if (user.status === 'frozen') throw new BankError('This profile is frozen. Please contact support.')
  if (amount > MAX_SINGLE_TRANSACTION) throw new BankError(`The limit per transaction is $${MAX_SINGLE_TRANSACTION.toLocaleString()}.`)
}

// Builds a transaction record (without id).
export function makeTx({
  uid, accountId = 'chk', type, direction, amount, description = '', category = 'Other', counterparty = '',
  counterpartyAccount = '', method = '', internal = false, balanceAfter = null, createdAt = Date.now(),
  createdBy, status = 'completed', checkImages = null, meta = null,
}) {
  return {
    uid, accountId, type, direction, amount, description, category, counterparty, counterpartyAccount, method,
    internal, balanceAfter, createdAt, createdBy: createdBy || uid, status, checkImages, meta,
  }
}

// Effect of a transaction on its account's balance (used to reverse a deleted one).
export function balanceEffect(acc, tx) {
  const up = isLiability(acc) ? tx.direction === 'debit' : tx.direction === 'credit'
  return up ? tx.amount : -tx.amount
}

// Real spending: money leaving you, not moving between your own accounts.
export const isSpending = (tx) => tx.direction === 'debit' && !tx.internal && tx.type !== 'adjustment' && tx.type !== 'trade'
export const isIncome = (tx) => tx.direction === 'credit' && !tx.internal && tx.type !== 'adjustment' && tx.type !== 'trade'
