// Charts built with Recharts (https://recharts.org).
import { PieChart as PieIcon } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Layer, Legend, Line, Pie, PieChart, Rectangle,
  ResponsiveContainer, Sankey, Tooltip, XAxis, YAxis,
} from 'recharts'
import { balanceSeries, monthlyCashflow, monthlyExpensesByCategory, moneyFlow, spendingByCategory } from '../lib/chartData'
import { CATEGORY_COLORS } from '../lib/constants'
import { money } from '../lib/format'
import { EmptyState } from './ui'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }
const kFmt = (v) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${v}`)
const axis = { tickLine: false, axisLine: false, fontSize: 11 }
const colorOf = (c) => CATEGORY_COLORS[c] || '#94a3b8'

export function ExpensesDonut({ transactions, days = 30, size = 'size-44' }) {
  const data = spendingByCategory(transactions, days)
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!data.length) return <EmptyState icon={PieIcon} title="No spending yet" text={`Your spending from the last ${days} days will appear here.`} />

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className={`relative ${size} shrink-0`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="100%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
              {data.map((d) => <Cell key={d.name} fill={colorOf(d.name)} />)}
            </Pie>
            <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{money(total)}</span>
          <span className="text-xs text-slate-500">Last {days} days</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-y-2 text-sm">
        {data.slice(0, 6).map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: colorOf(d.name) }} />
            <span className="flex-1 truncate text-slate-600">{d.name}</span>
            <span className="font-medium tabular-nums">{money(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CashflowChart({ transactions, months = 6 }) {
  const data = monthlyCashflow(transactions, months)
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={3}>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} tickFormatter={kFmt} />
          <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="In" name="Money in" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="Out" name="Money out" fill="#0b2a5b" radius={[6, 6, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Long-range "flow" of monthly expenses: total spending area + income line.
export function ExpenseTrendChart({ transactions, months = 12, height = 'h-72' }) {
  const data = monthlyCashflow(transactions, months)
  const avg = data.reduce((s, d) => s + d.Out, 0) / (data.length || 1)
  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="month" {...axis} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...axis} tickFormatter={kFmt} />
          <Tooltip formatter={(v, n) => [money(v), n]} contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Out" name="Expenses" stroke="#e11d48" strokeWidth={2.5} fill="url(#spendFill)" dot={months <= 12 ? { r: 3, fill: '#e11d48' } : false} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="In" name="Income" stroke="#16a34a" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          <Line type="monotone" dataKey={() => Math.round(avg)} name={`Avg ${kFmt(Math.round(avg))}/mo`} stroke="#94a3b8" strokeWidth={1} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryStackChart({ transactions, months = 12 }) {
  const { rows, categories } = monthlyExpensesByCategory(transactions, months)
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="month" {...axis} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...axis} tickFormatter={kFmt} />
          <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          {categories.map((c, i) => (
            <Bar key={c} dataKey={c} stackId="a" fill={colorOf(c)} radius={i === categories.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Sankey node with a label
function FlowNode({ x, y, width, height, index, payload }) {
  // Spending categories (right column) get their label on the left of the bar so it stays visible.
  const isRight = payload.depth === 2
  const color = payload.name === 'Money in' ? '#0b2a5b' : payload.name === 'Saved' ? '#16a34a' : colorOf(payload.name)
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} radius={2} />
      <text
        x={payload.depth === 1 ? x + width / 2 : isRight ? x - 6 : x + width + 6}
        y={payload.depth === 1 ? y - 8 : y + height / 2}
        textAnchor={payload.depth === 1 ? 'middle' : isRight ? 'end' : 'start'} dominantBaseline="middle" fontSize={11} fill="#334155">
        {payload.name} <tspan fill="#64748b">{kFmt(Math.round(payload.value))}</tspan>
      </text>
    </Layer>
  )
}

export function MoneyFlowChart({ transactions, days = 30 }) {
  const flow = moneyFlow(transactions, days)
  if (!flow) return <EmptyState icon={PieIcon} title="Nothing to show yet" />
  return (
    <div className="h-96 w-full">
      <ResponsiveContainer>
        <Sankey data={flow} nodePadding={18} nodeWidth={10} margin={{ top: 22, right: 10, bottom: 10, left: 10 }}
          node={<FlowNode />} link={{ stroke: '#0b2a5b', strokeOpacity: 0.15 }}>
          <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  )
}

export function BalanceChart({ transactions, accountId, color = '#0b2a5b', days = 180, label = 'Balance' }) {
  const data = balanceSeries(transactions, accountId, days)
  if (data.length < 2) return <p className="py-8 text-center text-sm text-slate-500">Not enough history for a chart yet.</p>
  return <LineArea data={data} dataKey="balance" color={color} label={label} />
}

export function LineArea({ data, dataKey, color = '#0b2a5b', label, height = 'h-56' }) {
  const id = `fill-${dataKey}-${color.slice(1)}`
  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="label" {...axis} minTickGap={30} />
          <YAxis {...axis} tickFormatter={kFmt} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => [money(v), label]} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Bank-wide volume (admin overview)
export function VolumeChart({ transactions, months = 12 }) {
  const data = monthlyCashflow(transactions, months)
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b2a5b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0b2a5b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} tickFormatter={kFmt} />
          <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="In" name="Money in" stroke="#0b2a5b" strokeWidth={2} fill="url(#vol)" />
          <Area type="monotone" dataKey="Out" name="Money out" stroke="#e11d48" strokeWidth={2} fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
