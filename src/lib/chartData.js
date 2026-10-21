// Turn transactions into chart-ready data. Pure functions = easy to test.
import { isIncome, isSpending } from './ledger'

const DAY = 86400000

export function spendingByCategory(txs, days = 30) {
  const since = Date.now() - days * DAY
  const totals = {}
  for (const t of txs) {
    if (!isSpending(t) || t.createdAt < since) continue
    totals[t.category] = (totals[t.category] || 0) + t.amount
  }
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

// Empty buckets for the last N calendar months (oldest first).
function monthBuckets(months) {
  const now = new Date()
  const list = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString('en-US', { month: 'short' }) + (months > 12 ? ` '${String(d.getFullYear()).slice(2)}` : ''),
      start: d.getTime(),
    })
  }
  return list
}
const keyOf = (ms) => `${new Date(ms).getFullYear()}-${new Date(ms).getMonth()}`

export function monthlyCashflow(txs, months = 6) {
  const buckets = monthBuckets(months).map((b) => ({ ...b, In: 0, Out: 0 }))
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))
  for (const t of txs) {
    const b = byKey[keyOf(t.createdAt)]
    if (!b) continue
    if (isIncome(t)) b.In += t.amount
    else if (isSpending(t)) b.Out += t.amount
  }
  return buckets.map((b) => ({ ...b, In: Math.round(b.In), Out: Math.round(b.Out), Net: Math.round(b.In - b.Out) }))
}

// Monthly spending split by category, for the stacked/flow charts.
export function monthlyExpensesByCategory(txs, months = 12) {
  const buckets = monthBuckets(months).map((b) => ({ ...b, total: 0 }))
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))
  const categories = new Set()
  for (const t of txs) {
    if (!isSpending(t)) continue
    const b = byKey[keyOf(t.createdAt)]
    if (!b) continue
    b[t.category] = (b[t.category] || 0) + t.amount
    b.total += t.amount
    categories.add(t.category)
  }
  const cats = [...categories]
  const rows = buckets.map((b) => {
    const r = { ...b, total: Math.round(b.total) }
    for (const c of cats) r[c] = Math.round(b[c] || 0)
    return r
  })
  // biggest categories first
  cats.sort((a, b) => rows.reduce((s, r) => s + r[b], 0) - rows.reduce((s, r) => s + r[a], 0))
  return { rows, categories: cats }
}

// Sankey "where your money went": income sources -> Income -> spending categories (+ Saved).
export function moneyFlow(txs, days = 30) {
  const since = Date.now() - days * DAY
  const sources = {}
  const sinks = {}
  for (const t of txs) {
    if (t.createdAt < since) continue
    if (isIncome(t)) {
      const name = t.category === 'Salary' ? 'Salary' : t.category === 'Interest' ? 'Interest' : t.method === 'send' ? 'Money received' : 'Other income'
      sources[name] = (sources[name] || 0) + t.amount
    } else if (isSpending(t)) {
      sinks[t.category] = (sinks[t.category] || 0) + t.amount
    }
  }
  const income = Object.values(sources).reduce((a, b) => a + b, 0)
  const spent = Object.values(sinks).reduce((a, b) => a + b, 0)
  if (!income && !spent) return null
  // Keep the top categories, group the rest
  let sinkList = Object.entries(sinks).sort((a, b) => b[1] - a[1])
  if (sinkList.length > 7) {
    const rest = sinkList.slice(6).reduce((s, [, v]) => s + v, 0)
    sinkList = [...sinkList.slice(0, 6), ['Everything else', rest]]
  }
  if (income > spent) sinkList.push(['Saved', income - spent])
  const sourceList = Object.entries(sources)
  if (spent > income) sourceList.push(['From balance', spent - income])

  const nodes = [...sourceList.map(([n]) => ({ name: n })), { name: 'Money in' }, ...sinkList.map(([n]) => ({ name: n }))]
  const hub = sourceList.length
  const links = [
    ...sourceList.map(([, v], i) => ({ source: i, target: hub, value: Math.round(v) })),
    ...sinkList.map(([, v], i) => ({ source: hub, target: hub + 1 + i, value: Math.round(v) })),
  ].filter((l) => l.value > 0)
  return { nodes, links, income, spent }
}

// Balance over time for one account, from each transaction's balanceAfter.
export function balanceSeries(txs, accountId, days = 180) {
  const since = Date.now() - days * DAY
  const pts = txs
    .filter((t) => t.accountId === accountId && t.balanceAfter != null && t.createdAt >= since)
    .sort((a, b) => a.createdAt - b.createdAt)
  const byDay = new Map()
  for (const t of pts) byDay.set(new Date(t.createdAt).toDateString(), { t: t.createdAt, balance: t.balanceAfter })
  return [...byDay.values()].map((p) => ({ ...p, label: new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))
}

// A smooth, made-up performance history ending at today's portfolio value.
export function portfolioSeries(currentValue, days = 365, seed = 7) {
  let x = seed
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280)
  const pts = []
  let v = currentValue
  for (let i = 0; i <= days; i += 3) {
    pts.unshift({ t: Date.now() - i * DAY, value: Math.round(v) })
    v = v / (1 + (rnd() - 0.47) * 0.025) // walk backwards with a slight upward trend
  }
  return pts.map((p) => ({ ...p, label: new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))
}
