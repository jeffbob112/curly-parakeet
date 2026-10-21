import { ArrowLeftRight, LineChart as LineIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { LineArea } from '../components/Charts'
import PageHeader from '../components/PageHeader'
import { AmountInput, Button, Card, EmptyState, ErrorNote, Field, Modal, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { accountValue, ageText, holdingsValue } from '../lib/accounts'
import { portfolioSeries } from '../lib/chartData'
import { STOCKS } from '../lib/constants'
import { money } from '../lib/format'
import api from '../services/api'

const COLORS = ['#0b2a5b', '#e11d48', '#16a34a', '#d4a017', '#7c3aed', '#0891b2', '#ea580c']
const RANGES = [['30', '1M'], ['90', '3M'], ['180', '6M'], ['365', '1Y']]

export default function Invest() {
  const { user } = useAuth()
  const acc = user.accounts?.inv
  const [range, setRange] = useState('365')
  const [order, setOrder] = useState(null) // { symbol, side }

  if (!acc || acc.status === 'closed') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Invest" />
        <Card strip>
          <EmptyState icon={LineIcon} title="Start investing" text="Open a Self-Directed Investing account to buy stocks and ETFs with $0 online trades.">
            <Link to="/app/products"><Button className="mt-2">Open an investment account</Button></Link>
          </EmptyState>
        </Card>
      </div>
    )
  }

  const total = accountValue(acc)
  const invested = holdingsValue(acc)
  const cost = (acc.holdings || []).reduce((s, h) => s + h.costBasis, 0)
  const gain = invested - cost
  const today = (acc.holdings || []).reduce((s, h) => s + h.shares * h.price * ((STOCKS.find((x) => x.symbol === h.symbol)?.change || 0) / 100), 0)

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <PageHeader title="Invest" subtitle={`Self-Directed Investing ••${String(acc.number).slice(-4)} · open ${ageText(acc.openedAt)}`}
        action={<Link to="/app/transfer/between?to=inv"><Button variant="outline"><ArrowLeftRight className="size-4" /> Add cash</Button></Link>} />

      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-light p-5 text-white shadow-lg">
        <p className="text-sm text-white/70">Total account value</p>
        <p className="text-4xl font-bold tabular-nums">{money(total)}</p>
        <p className={`mt-1 flex items-center gap-1 text-sm ${today >= 0 ? 'text-green-300' : 'text-rose-300'}`}>
          {today >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          {today >= 0 ? '+' : '−'}{money(Math.abs(today))} today
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div><dt className="text-white/70">Invested</dt><dd className="font-semibold">{money(invested)}</dd></div>
          <div><dt className="text-white/70">Cash</dt><dd className="font-semibold">{money(acc.balance)}</dd></div>
          <div><dt className="text-white/70">Total gain</dt><dd className={`font-semibold ${gain >= 0 ? 'text-green-300' : 'text-rose-300'}`}>{gain >= 0 ? '+' : '−'}{money(Math.abs(gain))}</dd></div>
        </dl>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card strip title="Performance" className="lg:col-span-2" action={
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            {RANGES.map(([v, l]) => <button key={v} onClick={() => setRange(v)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${range === v ? 'bg-white text-brand shadow' : 'text-slate-500'}`}>{l}</button>)}
          </div>
        }>
          <LineArea data={portfolioSeries(total, Number(range), user.uid.length)} dataKey="value" color="#16a34a" label="Value" height="h-64" />
          <p className="mt-1 text-[11px] text-slate-400">Illustrative performance for learning purposes.</p>
        </Card>
        <Card strip title="Allocation"><Allocation acc={acc} /></Card>
      </div>

      <Card strip title="Holdings">
        {!acc.holdings?.length ? <EmptyState icon={LineIcon} title="No holdings yet" text="Buy your first stock from the market list below." /> : (
          <ul className="divide-y divide-slate-100">
            {acc.holdings.map((h) => {
              const value = h.shares * h.price
              const g = value - h.costBasis
              return (
                <li key={h.symbol} className="flex items-center gap-3 py-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{h.symbol}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{h.name}</span><span className="text-xs text-slate-500">{h.shares} shares · {money(h.price)}</span></span>
                  <span className="text-right"><span className="block font-semibold tabular-nums">{money(value)}</span><span className={`text-xs ${g >= 0 ? 'text-green-700' : 'text-accent'}`}>{g >= 0 ? '+' : '−'}{money(Math.abs(g))}</span></span>
                  <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => setOrder({ symbol: h.symbol, side: 'sell' })}>Sell</Button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card strip title="Market">
        <ul className="divide-y divide-slate-100">
          {STOCKS.map((s) => (
            <li key={s.symbol} className="flex items-center gap-3 py-3">
              <span className="w-14 font-bold text-brand">{s.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{s.name}</span>
              <span className="text-right text-sm"><span className="block font-semibold">{money(s.price)}</span><span className={s.change >= 0 ? 'text-green-700' : 'text-accent'}>{s.change >= 0 ? '+' : ''}{s.change}%</span></span>
              <Button className="!min-h-9 !px-4" onClick={() => setOrder({ symbol: s.symbol, side: 'buy' })}>Buy</Button>
            </li>
          ))}
        </ul>
      </Card>
      {order && <TradeModal key={order.symbol + order.side} order={order} acc={acc} onClose={() => setOrder(null)} />}
    </div>
  )
}

function Allocation({ acc }) {
  const data = useMemo(() => [
    ...(acc.holdings || []).map((h) => ({ name: h.symbol, value: Math.round(h.shares * h.price) })),
    acc.balance > 0 && { name: 'Cash', value: Math.round(acc.balance) },
  ].filter(Boolean), [acc])
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div>
      <div className="mx-auto size-40">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="65%" outerRadius="100%" stroke="none" paddingAngle={2}>
              {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => money(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1">{d.name}</span><span className="tabular-nums text-slate-600">{((d.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TradeModal({ order, acc, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const [side, setSide] = useState(order.side)
  const [symbol, setSymbol] = useState(order.symbol)
  const [shares, setShares] = useState('1')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const stock = STOCKS.find((s) => s.symbol === symbol)
  const owned = acc.holdings?.find((h) => h.symbol === symbol)?.shares || 0
  const total = (Number(shares) || 0) * stock.price

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.trade(user.uid, { symbol, side, shares })
      toast(`Order filled: ${side} ${shares} ${symbol}`)
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Trade">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 rounded-full bg-slate-100 p-1">
          {['buy', 'sell'].map((s) => <button type="button" key={s} onClick={() => setSide(s)} className={`rounded-full py-2 text-sm font-semibold capitalize ${side === s ? 'bg-white text-brand shadow' : 'text-slate-500'}`}>{s}</button>)}
        </div>
        <Field label="Stock">
          <Select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {STOCKS.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name} ({money(s.price)})</option>)}
          </Select>
        </Field>
        <Field label="Shares" hint={side === 'sell' ? `You own ${owned} shares` : `Cash available: ${money(acc.balance)}`}>
          <AmountInput value={shares} onChange={(e) => setShares(e.target.value)} step="1" min="1" />
        </Field>
        <div className="flex justify-between rounded-xl bg-surface p-3 text-sm"><span>Estimated {side === 'buy' ? 'cost' : 'proceeds'}</span><strong>{money(total)}</strong></div>
        <ErrorNote error={error} />
        <Button type="submit" loading={busy} className="w-full capitalize">{side} {symbol}</Button>
      </form>
    </Modal>
  )
}
