// Charts built with Recharts (https://recharts.org).
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'
import { CATEGORY_COLORS } from '../lib/constants'
import { money } from '../lib/format'
import { EmptyState } from './ui'
import { PieChart as PieIcon } from 'lucide-react'
import { monthlyCashflow, spendingByCategory } from '../lib/chartData'

// --- chart components ---

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }

export function ExpensesDonut({ transactions, days = 30 }) {
  const data = spendingByCategory(transactions, days)
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!data.length) return <EmptyState icon={PieIcon} title="No spending yet" text={`Your spending from the last ${days} days will appear here.`} />

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="100%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
              {data.map((d) => <Cell key={d.name} fill={CATEGORY_COLORS[d.name] || '#94a3b8'} />)}
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
            <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLORS[d.name] || '#94a3b8' }} />
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
        <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)} />
          <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="In" name="Money in" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Out" name="Money out" fill="#0b2a5b" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Line of total deposits over time (admin overview)
export function VolumeChart({ transactions, months = 6 }) {
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
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
          <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="In" name="Money in" stroke="#0b2a5b" strokeWidth={2} fill="url(#vol)" />
          <Area type="monotone" dataKey="Out" name="Money out" stroke="#e11d48" strokeWidth={2} fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
