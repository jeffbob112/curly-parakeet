// Filtering + CSV export shared by the Activity, Account and admin Transactions pages.

export const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'Money in' },
  { id: 'out', label: 'Money out' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'purchase', label: 'Card purchases' },
  { id: 'payment', label: 'Payments' },
  { id: 'transfer', label: 'Transfers' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'wire', label: 'Wires' },
  { id: 'adjustment', label: 'Adjustments' },
]

export const RANGE_FILTERS = [
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: '365', label: 'Last 12 months' },
  { id: '730', label: 'Last 2 years' },
  { id: 'all', label: 'All time' },
]

export function filterTransactions(txs, { type = 'all', range = 'all', q = '', account = 'all' }, extraText = () => '') {
  const since = range === 'all' ? 0 : Date.now() - Number(range) * 86400000
  const needle = q.trim().toLowerCase()
  return (txs || []).filter((t) => {
    if (t.createdAt < since) return false
    if (account !== 'all' && t.accountId !== account) return false
    if (type === 'in' && t.direction !== 'credit') return false
    if (type === 'out' && t.direction !== 'debit') return false
    if (type === 'transfer' && !t.type.startsWith('transfer')) return false
    if (!['all', 'in', 'out', 'transfer'].includes(type) && t.type !== type) return false
    if (needle) {
      const hay = `${t.description} ${t.category} ${t.counterparty} ${t.amount} ${extraText(t)}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
}

export function downloadCsv(filename, txs, extraCols = []) {
  const cols = [
    ['Date', (t) => new Date(t.createdAt).toISOString()],
    ...extraCols,
    ['Account', (t) => t.accountId],
    ['Description', (t) => t.description],
    ['To/From', (t) => t.counterparty],
    ['Type', (t) => t.type],
    ['Category', (t) => t.category],
    ['Direction', (t) => t.direction],
    ['Amount', (t) => t.amount],
    ['Balance after', (t) => t.balanceAfter ?? ''],
    ['Status', (t) => t.status],
  ]
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`
  const csv = [cols.map((c) => esc(c[0])).join(','), ...txs.map((t) => cols.map((c) => esc(c[1](t))).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
