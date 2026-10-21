import { TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CategoryStackChart, ExpenseTrendChart, ExpensesDonut, MoneyFlowChart } from '../components/Charts'
import PageHeader from '../components/PageHeader'
import { Card, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { monthlyCashflow } from '../lib/chartData'
import { money } from '../lib/format'
import { useData } from '../lib/hooks'
import api from '../services/api'

const RANGES = [['6', '6M'], ['12', '1Y'], ['24', '2Y']]
const FLOW_RANGES = [['30', '30 days'], ['90', '90 days'], ['365', '1 year']]

function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${value === v ? 'bg-white text-brand shadow' : 'text-slate-500'}`}>{label}</button>
      ))}
    </div>
  )
}

export default function Expenses() {
  const { user } = useAuth()
  const [months, setMonths] = useState('12')
  const [flowDays, setFlowDays] = useState('30')
  const { data: txs, loading, error } = useData(() => api.listTransactions(user.uid), [user.uid])
  const rows = useMemo(() => (txs ? monthlyCashflow(txs, Number(months)) : []), [txs, months])
  const avg = rows.reduce((s, r) => s + r.Out, 0) / (rows.length || 1)
  const highest = rows.reduce((m, r) => (r.Out > (m?.Out ?? -1) ? r : m), null)

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <PageHeader title="Expenses & insights" subtitle="See how your spending flows month to month." />
      <ErrorNote error={error} />
      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              ['Avg / month', money(avg)],
              ['This month', money(rows[rows.length - 1]?.Out || 0)],
              ['Highest month', highest ? `${highest.month} · ${money(highest.Out).replace('.00', '')}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:p-4">
                <p className="text-xs text-slate-500 sm:text-sm">{k}</p>
                <p className="truncate font-bold sm:text-xl">{v}</p>
              </div>
            ))}
          </div>

          <Card strip title="Monthly expense flow" action={<Segmented options={RANGES} value={months} onChange={setMonths} />}>
            <ExpenseTrendChart transactions={txs} months={Number(months)} />
          </Card>

          <Card strip title="Where your money went" action={<Segmented options={FLOW_RANGES} value={flowDays} onChange={setFlowDays} />}>
            <p className="mb-2 text-xs text-slate-500">Money coming in (left) flowing out to what you spent it on (right). Transfers between your own accounts are not counted.</p>
            <MoneyFlowChart transactions={txs} days={Number(flowDays)} />
          </Card>

          <div className="grid gap-3 lg:grid-cols-5">
            <Card strip title="By category each month" className="lg:col-span-3"><CategoryStackChart transactions={txs} months={Number(months)} /></Card>
            <Card strip title="Last 30 days" className="lg:col-span-2"><ExpensesDonut transactions={txs} /></Card>
          </div>

          <Card strip title="Month by month">
            <ul className="divide-y divide-slate-100">
              {[...rows].reverse().map((r, i, arr) => {
                const prev = arr[i + 1]
                const change = prev && prev.Out ? ((r.Out - prev.Out) / prev.Out) * 100 : null
                return (
                  <li key={r.key} className="flex items-center gap-3 py-3 text-sm">
                    <span className="w-20 font-medium">{new Date(r.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    <span className="hidden flex-1 sm:block">
                      <span className="block h-2 rounded-full bg-accent/80" style={{ width: `${Math.min(100, (r.Out / (highest?.Out || 1)) * 100)}%` }} />
                    </span>
                    <span className="flex-1 text-right font-semibold tabular-nums sm:w-28 sm:flex-none">{money(r.Out)}</span>
                    <span className={`flex w-20 items-center justify-end gap-1 text-xs ${change == null ? 'text-slate-400' : change > 0 ? 'text-accent' : 'text-green-700'}`}>
                      {change == null ? '—' : <>{change > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}{Math.abs(change).toFixed(0)}%</>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
