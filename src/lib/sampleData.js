// Generates realistic-looking history so charts and tables have something to show.
// Used by the demo seed and by the admin "Generate sample history" button.

import { DEBIT_CATEGORIES } from './constants'

const MERCHANTS = {
  Food: ['Green Grocer', 'Taco Town', 'Corner Cafe', 'Pizza Palace'],
  Shopping: ['MegaMart', 'Shoe Spot', 'Online Store'],
  Utilities: ['Energy Co.', 'City Water', 'FiberNet Internet'],
  Mortgage: ['Home Loan Payment'],
  Transport: ['Metro Card', 'Fuel Stop', 'RideShare'],
  Entertainment: ['StreamFlix', 'Cinema 8', 'Concert Tickets'],
  Health: ['Pharmacy Plus', 'Dental Care'],
  'Student Loans': ['Student Loan Servicing'],
  Other: ['ATM Withdrawal', 'Misc. Purchase'],
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const round = (n) => Math.round(n * 100) / 100

// Returns a list of {type, direction, amount, description, category, createdAt}
// sorted oldest -> newest, never letting the running balance go negative.
export function generateHistory({ months = 6, startBalance = 0 } = {}) {
  const txs = []
  const now = Date.now()
  const day = 86400000
  let balance = startBalance

  const today = new Date()
  for (let m = months - 1; m >= 0; m--) {
    // Calendar months, so the data lines up with the monthly charts
    const monthStart = new Date(today.getFullYear(), today.getMonth() - m, 1, 9).getTime()
    // Paycheck on the 1st and 15th
    for (const offset of [0, 14]) {
      const t = monthStart + offset * day
      if (t > now) continue
      const amount = round(2200 + Math.random() * 600)
      balance += amount
      txs.push({ type: 'deposit', direction: 'credit', amount, description: 'Payroll - Acme Corp', category: 'Salary', createdAt: t })
    }
    // Monthly fixed bills
    const bills = [['Mortgage', 1100, 1100], ['Utilities', 90, 180], ['Student Loans', 250, 250]]
    for (const [category, min, max] of bills) {
      const t = monthStart + (3 + Math.random() * 5) * day
      if (t > now) continue
      const amount = round(min + Math.random() * (max - min))
      if (balance - amount < 0) continue
      balance -= amount
      txs.push({ type: 'payment', direction: 'debit', amount, description: pick(MERCHANTS[category]), category, createdAt: t })
    }
    // Everyday spending
    for (let i = 0; i < 8; i++) {
      const t = monthStart + Math.random() * 30 * day
      if (t > now) continue
      const category = pick(DEBIT_CATEGORIES.filter((c) => !['Mortgage', 'Student Loans', 'Utilities'].includes(c)))
      const amount = round(8 + Math.random() * (category === 'Shopping' ? 220 : 90))
      if (balance - amount < 0) continue
      balance -= amount
      const type = category === 'Other' ? 'withdrawal' : 'payment'
      txs.push({ type, direction: 'debit', amount, description: pick(MERCHANTS[category]), category, createdAt: t })
    }
  }
  return txs.sort((a, b) => a.createdAt - b.createdAt)
}
