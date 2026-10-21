// Every money action as a PURE function on a copy of the user.
// Each one validates, updates balances on `user.accounts`, and returns:
//   { txs: [...new transaction records], credit?: { uid, accountId, amount, tx } }
// `credit` is money going to ANOTHER customer — each backend applies it its own way.
// Both backends call these, so the business rules exist in exactly one place.

import { ACCOUNT_TYPES, accountShortName, isLiability, newAccount } from './accounts'
import { MONTHLY_CHECK_LIMIT, STOCKS, WIRE_FEES } from './constants'
import { BankError, applyMove, balanceEffect, checkCustomer, makeTx, parseAmount, round2 } from './ledger'

export const cloneUser = (u) => JSON.parse(JSON.stringify(u))

function getAccount(user, id) {
  const acc = user.accounts?.[id]
  if (!acc || acc.status === 'closed') throw new BankError(`You don't have an open ${ACCOUNT_TYPES[id]?.label || 'account'}.`)
  return acc
}

// Applies one leg and returns the finished tx record.
function leg(user, accountId, fields, by) {
  const acc = getAccount(user, accountId)
  acc.balance = applyMove(acc, fields.amount, fields.direction)
  return makeTx({ uid: user.uid, accountId, ...fields, balanceAfter: acc.balance, createdBy: by || user.uid })
}

// ---------------- customer actions ----------------

export function checkDepositUsed(txs, accountId) {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  return round2(txs.filter((t) => t.accountId === accountId && t.method === 'check' && t.createdAt >= start).reduce((s, t) => s + t.amount, 0))
}

export function opDeposit(user, { accountId = 'chk', amount, description, checkImages, monthUsed = 0 }) {
  const value = parseAmount(amount)
  checkCustomer(user, value)
  if (checkImages && monthUsed + value > MONTHLY_CHECK_LIMIT) {
    throw new BankError(`This would go over your monthly check deposit limit. You have $${round2(MONTHLY_CHECK_LIMIT - monthUsed).toLocaleString()} remaining.`)
  }
  return {
    txs: [leg(user, accountId, {
      type: 'deposit', direction: 'credit', amount: value, category: 'Deposit',
      description: description || (checkImages ? 'Mobile check deposit' : 'Deposit'),
      method: checkImages ? 'check' : 'cash', checkImages: checkImages || null,
    })],
  }
}

export function opWithdraw(user, { accountId = 'chk', amount, description }) {
  const value = parseAmount(amount)
  checkCustomer(user, value)
  return { txs: [leg(user, accountId, { type: 'withdrawal', direction: 'debit', amount: value, category: 'Other', description: description || 'ATM withdrawal', method: 'atm' })] }
}

export function opPayBill(user, { accountId = 'chk', payee, amount, category = 'Utilities' }) {
  const value = parseAmount(amount)
  checkCustomer(user, value)
  if (!payee) throw new BankError('Choose who you are paying.')
  return { txs: [leg(user, accountId, { type: 'payment', direction: 'debit', amount: value, category, description: payee, counterparty: payee, method: 'billpay' })] }
}

// Between the customer's own accounts (incl. paying a card or drawing from a HELOC).
export function opInternalTransfer(user, { from, to, amount, memo }) {
  const value = parseAmount(amount)
  checkCustomer(user, value)
  if (from === to) throw new BankError('Choose two different accounts.')
  const fromAcc = getAccount(user, from)
  const toAcc = getAccount(user, to)
  const toIsCard = isLiability(toAcc)
  // Moving money OUT of a liability (HELOC/card) = borrowing = debit (owe more).
  const outLeg = leg(user, from, {
    type: 'transfer_out', direction: 'debit', amount: value, internal: true, category: 'Transfers', method: 'internal',
    description: memo || `Transfer to ${accountShortName(toAcc)}`, counterparty: accountShortName(toAcc),
  })
  const inLeg = leg(user, to, {
    type: toIsCard ? 'payment' : 'transfer_in', direction: 'credit', amount: value, internal: true, category: 'Transfers', method: 'internal',
    description: toIsCard ? 'Payment - Thank you' : memo || `Transfer from ${accountShortName(fromAcc)}`, counterparty: accountShortName(fromAcc),
  })
  return { txs: [outLeg, inLeg] }
}

// Send to another Parakeet customer. recipient = { uid, fullName, accountNumber, accountId }
export function opSend(user, recipient, { from = 'chk', amount, memo }) {
  const value = parseAmount(amount)
  checkCustomer(user, value)
  if (!recipient) throw new BankError('No account found with that number.')
  if (recipient.uid === user.uid) throw new BankError('To move money between your own accounts, use "Between my accounts".')
  const note = memo || 'Payment'
  const out = leg(user, from, {
    type: 'transfer_out', direction: 'debit', amount: value, category: 'Transfers', method: 'send',
    description: note, counterparty: recipient.fullName, counterpartyAccount: recipient.accountNumber,
  })
  const myAcc = getAccount(user, from)
  return {
    txs: [out],
    credit: {
      uid: recipient.uid, accountId: recipient.accountId || 'chk', amount: value,
      tx: makeTx({
        uid: recipient.uid, accountId: recipient.accountId || 'chk', type: 'transfer_in', direction: 'credit', amount: value,
        category: 'Transfers', method: 'send', description: note, counterparty: user.fullName, counterpartyAccount: myAcc.number, createdBy: user.uid,
      }),
    },
  }
}

export function opWire(user, { from = 'chk', amount, recipientName, bankName, routing, accountNumber, international, swift, country }) {
  const value = parseAmount(amount)
  checkCustomer(user, value)
  if (!recipientName || !bankName || !accountNumber) throw new BankError('Fill in the recipient, bank and account number.')
  const fee = international ? WIRE_FEES.international : WIRE_FEES.domestic
  const acc = getAccount(user, from)
  if (!isLiability(acc) && acc.balance < value + fee) throw new BankError(`Insufficient funds. You need $${(value + fee).toFixed(2)} including the $${fee} wire fee.`)
  const wire = leg(user, from, {
    type: 'wire', direction: 'debit', amount: value, category: 'Transfers', method: international ? 'wire_intl' : 'wire',
    description: `${international ? 'International' : 'Domestic'} wire to ${recipientName}`, counterparty: recipientName,
    counterpartyAccount: `${bankName} ••${String(accountNumber).slice(-4)}`,
    meta: { bankName, routing: routing || '', swift: swift || '', country: country || '' },
  })
  const feeTx = leg(user, from, { type: 'fee', direction: 'debit', amount: fee, category: 'Fees', description: `${international ? 'International' : 'Domestic'} wire fee`, method: 'fee' })
  return { txs: [wire, feeTx] }
}

export function opTrade(user, { symbol, side, shares }) {
  const qty = Number(shares)
  if (!Number.isFinite(qty) || qty <= 0) throw new BankError('Enter how many shares.')
  if (user.status === 'frozen') throw new BankError('This profile is frozen. Please contact support.')
  const stock = STOCKS.find((s) => s.symbol === symbol)
  if (!stock) throw new BankError('Unknown stock.')
  const acc = getAccount(user, 'inv')
  acc.holdings = acc.holdings || []
  const total = round2(qty * stock.price)
  let h = acc.holdings.find((x) => x.symbol === symbol)
  if (side === 'buy') {
    acc.balance = applyMove(acc, total, 'debit') // uses the account's cash
    if (!h) acc.holdings.push((h = { symbol, name: stock.name, shares: 0, price: stock.price, costBasis: 0 }))
    h.costBasis = round2(h.costBasis + total)
    h.shares = round2(h.shares + qty)
  } else {
    if (!h || h.shares < qty) throw new BankError(`You only own ${h?.shares || 0} shares of ${symbol}.`)
    h.costBasis = round2(h.costBasis * (1 - qty / h.shares))
    h.shares = round2(h.shares - qty)
    acc.balance = applyMove(acc, total, 'credit')
    if (h.shares === 0) acc.holdings = acc.holdings.filter((x) => x.symbol !== symbol)
  }
  return {
    txs: [makeTx({
      uid: user.uid, accountId: 'inv', type: 'trade', direction: side === 'buy' ? 'debit' : 'credit', amount: total,
      category: 'Other', description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${symbol} @ $${stock.price}`, method: 'trade', balanceAfter: acc.balance,
    })],
  }
}

export function opOpenAccount(user, id) {
  if (user.accounts?.[id] && user.accounts[id].status !== 'closed') throw new BankError('You already have this account.')
  user.accounts = { ...user.accounts, [id]: newAccount(id) }
  return { txs: [] }
}

// ---------------- admin actions ----------------

export function opAdminTransaction(user, adminUid, { accountId, type, direction, amount, description, category, counterparty = '', createdAt }) {
  const value = parseAmount(amount)
  const tx = leg(user, accountId, { type, direction, amount: value, description, category, counterparty }, adminUid)
  tx.createdAt = createdAt || Date.now()
  return { txs: [tx] }
}

export function opAdminSetBalance(user, adminUid, accountId, target) {
  const value = round2(Number(target))
  if (!Number.isFinite(value) || value < 0) throw new BankError('Balance must be 0 or more.')
  const acc = getAccount(user, accountId)
  const diff = round2(value - acc.balance)
  if (diff === 0) return { txs: [] }
  // For a card/HELOC, a higher balance means they owe more = debit.
  const direction = isLiability(acc) ? (diff > 0 ? 'debit' : 'credit') : (diff > 0 ? 'credit' : 'debit')
  if (isLiability(acc) && value > (acc.creditLimit || 0)) acc.creditLimit = Math.ceil(value / 1000) * 1000
  return opAdminTransaction(user, adminUid, { accountId, type: 'adjustment', direction, amount: Math.abs(diff), description: 'Balance adjustment by admin', category: 'Other' })
}

export function opAdminUpdateAccount(user, accountId, patch) {
  const existing = user.accounts?.[accountId]
  if (patch.status === 'open' && (!existing || existing.status === 'closed')) {
    user.accounts = { ...user.accounts, [accountId]: { ...newAccount(accountId), ...(existing && { number: existing.number }), status: 'open' } }
    return { txs: [] }
  }
  if (!existing) throw new BankError('Account not found.')
  if (patch.status === 'closed' && Math.abs(existing.balance) > 0.001) throw new BankError('Set the balance to $0 before closing this account.')
  for (const k of ['status', 'creditLimit', 'openedAt']) if (k in patch && patch[k] !== undefined) existing[k] = patch[k]
  if ('creditLimit' in patch && existing.balance > existing.creditLimit) throw new BankError('Credit limit is lower than the current balance.')
  return { txs: [] }
}

// Undo a transaction's effect so the balance stays consistent with history.
export function reverseTx(user, tx) {
  const acc = user.accounts?.[tx.accountId]
  if (!acc) return
  const next = round2(acc.balance - balanceEffect(acc, tx))
  if (next < -0.001) throw new BankError('Deleting this would make the balance negative.')
  acc.balance = next
}
