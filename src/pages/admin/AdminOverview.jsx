import { Activity, AlertTriangle, Landmark, RotateCcw, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ExpensesDonut, VolumeChart } from '../../components/Charts'
import PageHeader from '../../components/PageHeader'
import TransactionList from '../../components/Transactions'
import { Button, Card, ErrorNote, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { money } from '../../lib/format'
import { useData } from '../../lib/hooks'
import api from '../../services/api'

function Stat({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = { brand: 'bg-brand/10 text-brand', green: 'bg-green-100 text-green-700', red: 'bg-rose-100 text-accent', amber: 'bg-amber-100 text-amber-700' }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const toast = useToast()
  const { data, loading, error } = useData(async () => {
    const [users, txs] = await Promise.all([api.listUsers(), api.listAllTransactions()])
    return { users, txs }
  })

  const stats = useMemo(() => {
    if (!data) return null
    const customers = data.users.filter((u) => u.role !== 'admin')
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    return {
      customers: customers.length,
      deposits: data.users.reduce((s, u) => s + (u.balance || 0), 0),
      txMonth: data.txs.filter((t) => t.createdAt >= monthStart).length,
      frozen: data.users.filter((u) => u.status === 'frozen').length,
    }
  }, [data])

  const usersById = useMemo(() => Object.fromEntries((data?.users || []).map((u) => [u.uid, u])), [data])

  const reset = async () => {
    if (!window.confirm('Reset all demo data? Every account and transaction will be replaced with fresh sample data.')) return
    await api.resetDemoData()
    toast('Demo data reset. Please log in again.')
  }

  if (loading) return <Spinner />
  return (
    <div className="space-y-4">
      <PageHeader title="Admin overview" subtitle="Bank-wide numbers at a glance."
        action={api.resetDemoData && <Button variant="danger" onClick={reset}><RotateCcw className="size-4" /> Reset demo data</Button>} />
      <ErrorNote error={error} />
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Users} label="Customers" value={stats.customers} />
          <Stat icon={Landmark} label="Total deposits held" value={money(stats.deposits)} tone="green" />
          <Stat icon={Activity} label="Transactions this month" value={stats.txMonth} tone="amber" />
          <Stat icon={AlertTriangle} label="Frozen accounts" value={stats.frozen} tone="red" />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card strip title="Money in vs. out (all customers)" className="lg:col-span-3"><VolumeChart transactions={data?.txs || []} /></Card>
        <Card strip title="Spending by category" className="lg:col-span-2"><ExpensesDonut transactions={data?.txs || []} /></Card>
      </div>
      <Card strip title="Latest transactions" action={<Link to="/admin/transactions" className="text-sm font-semibold text-brand">View all</Link>}>
        <TransactionList transactions={(data?.txs || []).slice(0, 8)} showOwner usersById={usersById} />
      </Card>
    </div>
  )
}
