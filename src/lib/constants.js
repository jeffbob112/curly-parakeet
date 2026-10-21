// Shared constants: transaction types and categories.

export const TX_TYPES = {
  deposit: { label: 'Deposit' },
  withdrawal: { label: 'Withdrawal' },
  transfer_in: { label: 'Transfer in' },
  transfer_out: { label: 'Transfer out' },
  payment: { label: 'Payment' },
  purchase: { label: 'Card purchase' },
  wire: { label: 'Wire' },
  fee: { label: 'Fee' },
  interest: { label: 'Interest' },
  trade: { label: 'Trade' },
  adjustment: { label: 'Adjustment' },
}

export const DEBIT_CATEGORIES = [
  'Food', 'Groceries', 'Shopping', 'Utilities', 'Mortgage', 'Transport', 'Entertainment', 'Health',
  'Student Loans', 'Insurance', 'Travel', 'Transfers', 'Fees', 'Other',
]
export const CREDIT_CATEGORIES = ['Salary', 'Deposit', 'Refund', 'Transfers', 'Interest', 'Other']

export const CATEGORY_COLORS = {
  Food: '#2563eb',
  Groceries: '#0d9488',
  Shopping: '#db2777',
  Utilities: '#d4a017',
  Mortgage: '#4f46e5',
  Transport: '#0891b2',
  Entertainment: '#7c3aed',
  Health: '#ea580c',
  'Student Loans': '#6d28d9',
  Insurance: '#475569',
  Travel: '#e11d48',
  Transfers: '#94a3b8',
  Fees: '#b91c1c',
  Other: '#64748b',
}

export const AVATAR_COLORS = ['#0b2a5b', '#e11d48', '#16a34a', '#7c3aed', '#ea580c', '#0891b2']

export const MAX_SINGLE_TRANSACTION = 50000
export const MONTHLY_CHECK_LIMIT = 10000
export const WIRE_FEES = { domestic: 25, international: 45 }

// Saved payees for Bill Pay (dummy)
export const PAYEES = [
  { name: 'Energy Co.', category: 'Utilities', account: '•••• 4410' },
  { name: 'City Water', category: 'Utilities', account: '•••• 9021' },
  { name: 'FiberNet Internet', category: 'Utilities', account: '•••• 3378' },
  { name: 'Shield Auto Insurance', category: 'Insurance', account: '•••• 7712' },
  { name: 'Home Loan Servicing', category: 'Mortgage', account: '•••• 1180' },
]

// Stocks you can trade on the Invest page (dummy prices).
export const STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 228.4, change: 1.12 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 431.75, change: -0.48 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 138.2, change: 2.31 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 192.6, change: 0.74 },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', price: 532.1, change: 0.36 },
  { symbol: 'KO', name: 'Coca-Cola Co.', price: 69.8, change: -0.21 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 251.3, change: -1.64 },
]
