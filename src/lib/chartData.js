// Turn transactions into chart-ready data. Pure functions = easy to test.

const DAY = 86400000

export function spendingByCategory(txs, days = 30) {
  const since = Date.now() - days * DAY
  const totals = {}
  for (const t of txs) {
    // admin balance adjustments aren't real spending, so leave them out
    if (t.direction !== 'debit' || t.type === 'adjustment' || t.createdAt < since) continue
    totals[t.category] = (totals[t.category] || 0) + t.amount
  }
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export function monthlyCashflow(txs, months = 6) {
  const now = new Date()
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString('en-US', { month: 'short' }), In: 0, Out: 0 })
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))
  for (const t of txs) {
    const d = new Date(t.createdAt)
    const b = byKey[`${d.getFullYear()}-${d.getMonth()}`]
    if (!b) continue
    b[t.direction === 'credit' ? 'In' : 'Out'] += t.amount
  }
  return buckets.map((b) => ({ ...b, In: Math.round(b.In), Out: Math.round(b.Out) }))
}
