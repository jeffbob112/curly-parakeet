// Account products. Every customer can hold up to one of each, using these fixed ids.
//   asset accounts      -> balance = money you HAVE   (checking, savings, investment cash)
//   liability accounts  -> balance = money you OWE    (credit card, home equity line)

export const ACCOUNT_TYPES = {
  chk: { id: 'chk', label: 'Adv Plus Banking', short: 'Chkg', group: 'Banking', kind: 'asset', receives: true },
  sav: { id: 'sav', label: 'Advantage Savings', short: 'Sav', group: 'Banking', kind: 'asset', receives: true, apy: 2.15 },
  cc: { id: 'cc', label: 'Customized Cash Rewards Visa', short: 'Visa', group: 'Credit Cards', kind: 'liability', apr: 21.24 },
  heloc: { id: 'heloc', label: 'Home Equity Line of Credit', short: 'HELOC', group: 'Loans', kind: 'liability', apr: 8.49 },
  inv: { id: 'inv', label: 'Self-Directed Investing', short: 'Invest', group: 'Investments', kind: 'asset' },
}

export const ACCOUNT_ORDER = ['chk', 'sav', 'cc', 'heloc', 'inv']
export const GROUPS = ['Banking', 'Credit Cards', 'Loans', 'Investments']

// Products a customer can open themselves from the "Products" page.
export const PRODUCTS = {
  chk: { blurb: 'Everyday checking with no monthly fee when you set up direct deposit.', defaults: {} },
  sav: { blurb: 'Grow your savings with 2.15% APY. Transfer any time.', defaults: {} },
  cc: { blurb: '6% cash back in the category of your choice. No annual fee.', defaults: { creditLimit: 5000 } },
  heloc: { blurb: 'Borrow against your home with a flexible line of credit.', defaults: { creditLimit: 25000 } },
  inv: { blurb: 'Buy and sell stocks and ETFs with $0 online trades.', defaults: { holdings: [] } },
}

export const isLiability = (acc) => ACCOUNT_TYPES[acc.id]?.kind === 'liability'

const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')
export const newAccountNumber = () => String(1 + Math.floor(Math.random() * 9)) + digits(9)

export function newAccount(id, overrides = {}) {
  return {
    id,
    number: id === 'cc' ? '4' + digits(15) : newAccountNumber(), // card numbers are 16 digits
    balance: 0,
    openedAt: Date.now(),
    status: 'open',
    ...PRODUCTS[id].defaults,
    ...overrides,
  }
}

// Open accounts in display order
export const accountList = (user) =>
  ACCOUNT_ORDER.map((id) => user?.accounts?.[id]).filter((a) => a && a.status !== 'closed')

export const accountName = (acc) => `${ACCOUNT_TYPES[acc.id].label} ${ACCOUNT_TYPES[acc.id].short} - ${String(acc.number).slice(-4)}`
export const accountShortName = (acc) => `${ACCOUNT_TYPES[acc.id].label} ••${String(acc.number).slice(-4)}`

export const holdingsValue = (acc) => (acc.holdings || []).reduce((s, h) => s + h.shares * h.price, 0)

// What the account is worth to the customer (investments include their stocks).
export const accountValue = (acc) => (acc.id === 'inv' ? acc.balance + holdingsValue(acc) : acc.balance)

// Money you can spend / borrow right now
export const available = (acc) => (isLiability(acc) ? (acc.creditLimit || 0) - acc.balance : acc.balance)

export function netWorth(user) {
  return accountList(user).reduce((s, a) => s + (isLiability(a) ? -a.balance : accountValue(a)), 0)
}

// Minimum payment for a card / line of credit (simple rule: 2% or $35)
export const minimumPayment = (acc) => (acc.balance <= 0 ? 0 : Math.min(acc.balance, Math.max(35, Math.round(acc.balance * 0.02 * 100) / 100)))

export function paymentDueDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + (d.getDate() > 20 ? 1 : 0), 25)
  return d.getTime()
}

// "3 yrs 2 mos"
export function ageText(since) {
  const months = Math.max(0, Math.floor((Date.now() - since) / (30.44 * 86400000)))
  const y = Math.floor(months / 12)
  const m = months % 12
  if (!y && !m) return 'New this month'
  return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' ')
}

// Fake but realistic-looking routing number for display only.
export const ROUTING_NUMBER = '121 000 358'
