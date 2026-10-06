// Shared constants: transaction types and categories.

export const TX_TYPES = {
  deposit: { label: 'Deposit', direction: 'credit' },
  withdrawal: { label: 'Withdrawal', direction: 'debit' },
  transfer_in: { label: 'Transfer in', direction: 'credit' },
  transfer_out: { label: 'Transfer out', direction: 'debit' },
  payment: { label: 'Payment', direction: 'debit' },
  adjustment: { label: 'Adjustment', direction: null }, // admin chooses credit/debit
}

export const DEBIT_CATEGORIES = [
  'Food', 'Shopping', 'Utilities', 'Mortgage', 'Transport', 'Entertainment', 'Health', 'Student Loans', 'Other',
]
export const CREDIT_CATEGORIES = ['Salary', 'Deposit', 'Refund', 'Transfer', 'Interest', 'Other']

// Colors for categories in charts (kept distinct and readable in light mode).
export const CATEGORY_COLORS = {
  Food: '#1d4ed8',
  Shopping: '#db2777',
  Utilities: '#d4a017',
  Mortgage: '#16a34a',
  Transport: '#0891b2',
  Entertainment: '#7c3aed',
  Health: '#ea580c',
  'Student Loans': '#6d28d9',
  Other: '#64748b',
}

export const AVATAR_COLORS = ['#0b2a5b', '#e11d48', '#16a34a', '#7c3aed', '#ea580c', '#0891b2']

export const MAX_SINGLE_TRANSACTION = 50000
