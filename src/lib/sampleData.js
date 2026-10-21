// Generates realistic-looking history across all of a customer's accounts so charts,
// tables and the account pages have something to show. Used by the demo seed and
// by the admin "Generate sample history" button.
//
// Output: a chronological list of "items". Each item is one event with one or more
// legs (e.g. a credit card payment = money out of checking + money into the card).

import { ACCOUNT_TYPES, isLiability } from './accounts'
import { round2 } from './ledger'

const DAY = 86400000
const PEOPLE = ['Maria Garcia', 'David Kim', 'Aisha Bello', 'Chris Johnson', 'Sofia Rossi', 'Kwame Mensah', 'Emily Chen', 'Lucas Silva', 'Priya Patel', 'Tom Walker']
const P2P_NOTES = ['Dinner split', 'Concert tickets', 'Rent share', 'Birthday gift', 'Groceries', 'Road trip gas', 'Movie night', 'Thanks!']
const CARD_SPEND = {
  Groceries: ['Green Grocer', 'FreshMart', 'Whole Harvest'],
  Food: ['Taco Town', 'Corner Cafe', 'Pizza Palace', 'Sushi Go', 'Burger Barn'],
  Shopping: ['MegaMart', 'Shoe Spot', 'Online Store', 'Book Nook', 'Tech Hub'],
  Transport: ['Fuel Stop', 'RideShare', 'Metro Card', 'City Parking'],
  Entertainment: ['StreamFlix', 'Cinema 8', 'Game World', 'Music+'],
  Health: ['Pharmacy Plus', 'FitLife Gym', 'Dental Care'],
  Travel: ['SkyHigh Airlines', 'Grand Hotel', 'Island Resorts'],
}

const rand = (min, max) => round2(min + Math.random() * (max - min))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const one = (accountId, direction, amount, f) => ({ accountId, direction, amount, ...f })

/**
 * @param months    how many months back
 * @param accounts  { chk: openedAt, sav: openedAt, ... } which accounts exist and since when
 * @param balances  starting balances { chk: 0, ... }
 */
export function generateHistory({ months = 24, accounts, balances = {} }) {
  const now = Date.now()
  const today = new Date()
  const has = (id, t) => accounts[id] != null && t >= accounts[id] && t <= now
  const raw = [] // { t, legs | dynamic }

  for (let m = months - 1; m >= 0; m--) {
    const start = new Date(today.getFullYear(), today.getMonth() - m, 1, 9).getTime()
    const at = (d) => start + (d - 1) * DAY + Math.floor(Math.random() * 10) * 3600000
    const add = (t, legs) => has(legs[0].accountId, t) && legs.every((l) => has(l.accountId, t)) && raw.push({ t, legs })

    // Income
    for (const d of [1, 15]) add(at(d), [one('chk', 'credit', rand(2350, 2750), { type: 'deposit', description: 'Payroll - Acme Corp', category: 'Salary', counterparty: 'Acme Corp', method: 'ach' })])
    if (Math.random() < 0.3) add(at(5 + Math.floor(Math.random() * 20)), [one('chk', 'credit', rand(150, 800), { type: 'deposit', description: 'Mobile check deposit', category: 'Deposit', method: 'check' })])

    // Bills from checking
    add(at(3), [one('chk', 'debit', 1450, { type: 'payment', description: 'Home Loan Servicing', counterparty: 'Home Loan Servicing', category: 'Mortgage', method: 'billpay' })])
    add(at(6), [one('chk', 'debit', rand(85, 185), { type: 'payment', description: 'Energy Co.', counterparty: 'Energy Co.', category: 'Utilities', method: 'billpay' })])
    add(at(8), [one('chk', 'debit', rand(35, 70), { type: 'payment', description: 'City Water', counterparty: 'City Water', category: 'Utilities', method: 'billpay' })])
    add(at(10), [one('chk', 'debit', 64.99, { type: 'payment', description: 'FiberNet Internet', counterparty: 'FiberNet Internet', category: 'Utilities', method: 'billpay' })])
    add(at(12), [one('chk', 'debit', 128.4, { type: 'payment', description: 'Shield Auto Insurance', counterparty: 'Shield Auto Insurance', category: 'Insurance', method: 'billpay' })])
    add(at(14), [one('chk', 'debit', 250, { type: 'payment', description: 'Student Loan Servicing', counterparty: 'Student Loan Servicing', category: 'Student Loans', method: 'billpay' })])

    // Cash + person-to-person
    for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) add(at(1 + Math.floor(Math.random() * 27)), [one('chk', 'debit', pick([40, 60, 80, 100, 200]), { type: 'withdrawal', description: 'ATM withdrawal', category: 'Other', method: 'atm' })])
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const person = pick(PEOPLE)
      const incoming = Math.random() < 0.45
      add(at(1 + Math.floor(Math.random() * 27)), [one('chk', incoming ? 'credit' : 'debit', rand(15, incoming ? 150 : 220), {
        type: incoming ? 'transfer_in' : 'transfer_out', description: pick(P2P_NOTES), counterparty: person, category: 'Transfers', method: 'send',
      })])
    }

    // Card purchases (or debit-card purchases from checking if there's no credit card)
    const card = accounts.cc != null ? 'cc' : 'chk'
    for (let i = 0; i < 12 + Math.floor(Math.random() * 8); i++) {
      const category = Math.random() < 0.04 ? 'Travel' : pick(['Groceries', 'Groceries', 'Food', 'Food', 'Shopping', 'Transport', 'Entertainment', 'Health'])
      const max = { Travel: 650, Shopping: 180, Groceries: 140 }[category] || 70
      add(at(1 + Math.floor(Math.random() * 28)), [one(card, 'debit', rand(6, max), { type: 'purchase', description: pick(CARD_SPEND[category]), counterparty: '', category, method: 'card' })])
    }
    if (Math.random() < 0.15 && accounts.cc != null) add(at(20), [one('cc', 'credit', rand(15, 90), { type: 'payment', description: 'Refund - MegaMart', category: 'Refund', method: 'card' })])

    // Internal moves
    add(at(16), [
      one('chk', 'debit', 300, { type: 'transfer_out', description: 'Transfer to Advantage Savings', category: 'Transfers', internal: true, method: 'internal' }),
      one('sav', 'credit', 300, { type: 'transfer_in', description: 'Transfer from Adv Plus Banking', category: 'Transfers', internal: true, method: 'internal' }),
    ])
    add(at(28), [one('sav', 'credit', 0, { type: 'interest', description: 'Interest earned', category: 'Interest', method: 'interest', dynamic: 'savInterest' })])
    add(at(22), [
      one('chk', 'debit', 0, { type: 'transfer_out', description: 'Payment to Visa card', category: 'Transfers', internal: true, method: 'internal', dynamic: 'ccFull' }),
      one('cc', 'credit', 0, { type: 'payment', description: 'Payment - Thank you', category: 'Transfers', internal: true, method: 'internal', dynamic: 'ccFull' }),
    ])
    add(at(18), [
      one('chk', 'debit', 220, { type: 'transfer_out', description: 'Home equity payment', category: 'Transfers', internal: true, method: 'internal' }),
      one('heloc', 'credit', 220, { type: 'payment', description: 'Payment - Thank you', category: 'Transfers', internal: true, method: 'internal' }),
    ])
    add(at(17), [
      one('chk', 'debit', 400, { type: 'transfer_out', description: 'Transfer to Self-Directed Investing', category: 'Transfers', internal: true, method: 'internal' }),
      one('inv', 'credit', 400, { type: 'transfer_in', description: 'Transfer from Adv Plus Banking', category: 'Transfers', internal: true, method: 'internal' }),
    ])
  }

  // One-off: a home-equity draw for a renovation, a few weeks after the line opened.
  if (accounts.heloc != null) {
    const t = accounts.heloc + 20 * DAY
    if (t < now) {
      raw.push({ t, legs: [
        one('heloc', 'debit', 9000, { type: 'transfer_out', description: 'Draw to Adv Plus Banking', category: 'Transfers', internal: true, method: 'internal' }),
        one('chk', 'credit', 9000, { type: 'transfer_in', description: 'Draw from Home Equity Line', category: 'Transfers', internal: true, method: 'internal' }),
      ] })
      raw.push({ t: t + 3 * DAY, legs: [one('chk', 'debit', 8400, { type: 'payment', description: 'Bright Kitchens LLC', counterparty: 'Bright Kitchens LLC', category: 'Shopping', method: 'billpay' })] })
    }
  }

  // Simulate in date order: fill in dynamic amounts and drop anything that wouldn't fit.
  raw.sort((a, b) => a.t - b.t)
  const bal = { ...balances }
  const items = []
  for (const { t, legs } of raw) {
    const resolved = legs.map((l) => {
      let amount = l.amount
      if (l.dynamic === 'ccFull') amount = round2(bal.cc || 0)
      if (l.dynamic === 'savInterest') amount = round2(((bal.sav || 0) * (ACCOUNT_TYPES.sav.apy / 100)) / 12)
      const { dynamic: _d, ...rest } = l
      return { ...rest, amount }
    })
    if (resolved.some((l) => l.amount <= 0)) continue
    const next = { ...bal }
    let ok = true
    for (const l of resolved) {
      const liability = isLiability({ id: l.accountId })
      const up = liability ? l.direction === 'debit' : l.direction === 'credit'
      next[l.accountId] = round2((next[l.accountId] || 0) + (up ? l.amount : -l.amount))
      if (next[l.accountId] < 0) ok = false
    }
    if (!ok) continue
    Object.assign(bal, next)
    items.push({ createdAt: t, legs: resolved })
  }
  return items
}

// Starter portfolio for the investment account.
export function sampleHoldings() {
  return [
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', shares: 14, price: 532.1, costBasis: 5810 },
    { symbol: 'AAPL', name: 'Apple Inc.', shares: 22, price: 228.4, costBasis: 3920 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 8, price: 431.75, costBasis: 2860 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 30, price: 138.2, costBasis: 2150 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 10, price: 192.6, costBasis: 1640 },
  ]
}
