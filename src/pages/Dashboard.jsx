import { ArrowLeftRight, ChevronRight, Eye, EyeOff, PlusCircle, Receipt, Search, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CashflowChart, ExpensesDonut } from '../components/Charts'
import TransactionList from '../components/Transactions'
import TxDetail from '../components/TxDetail'
import { Badge, Card, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { maskAccount, money } from '../lib/format'
import { useData } from '../lib/hooks'
import api from '../services/api'

const quickActions = [
  { to: '/app/transfer', label: 'Transfer', icon: ArrowLeftRight },
  { to: '/app/deposit', label: 'Deposit', icon: PlusCircle },
  { to: '/app/transfer?tab=withdraw', label: 'Withdraw', icon: Wallet },
  { to: '/app/transfer?tab=bill', label: 'Pay bills', icon: Receipt },
]

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showBalance, setShowBalance] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const { data: txs, loading, error } = useData(() => api.listTransactions(user.uid), [user.uid])

  const monthStats = useMemo(() => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    const stats = { in: 0, out: 0 }
    for (const t of txs || []) if (t.createdAt >= start) stats[t.direction === 'credit' ? 'in' : 'out'] += t.amount
    return stats
  }, [txs])

  const onSearch = (e) => {
    e.preventDefault()
    navigate(`/app/activity?q=${encodeURIComponent(search)}`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Search bar like the "How can we help?" bar in the screenshots */}
      <form onSubmit={onSearch} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your transactions…"
          className="h-11 w-full rounded-full bg-white pl-11 pr-4 text-base shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand/30 sm:text-sm" />
      </form>

      {user.status === 'frozen' && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Your account is frozen. Deposits, withdrawals and transfers are disabled. Please contact support.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Balance card */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-light p-5 text-white shadow-lg lg:col-span-3">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 right-10 size-40 rounded-full bg-accent/20" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">{greeting()},</p>
                <p className="text-lg font-semibold">{user.fullName}</p>
              </div>
              <Badge color={user.status === 'frozen' ? 'red' : 'green'}>{user.status === 'frozen' ? 'Frozen' : 'Active'}</Badge>
            </div>
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider text-white/70">Adv Plus Checking · {maskAccount(user.accountNumber)}</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-4xl font-bold tabular-nums">{showBalance ? money(user.balance) : '$ ••••••'}</p>
                <button onClick={() => setShowBalance(!showBalance)} className="rounded-full p-2 hover:bg-white/10" aria-label={showBalance ? 'Hide balance' : 'Show balance'}>
                  {showBalance ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              <p className="text-sm text-white/70">Available balance</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/70">In this month</p>
                <p className="font-semibold">{money(monthStats.in)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/70">Out this month</p>
                <p className="font-semibold">{money(monthStats.out)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 lg:col-span-2 lg:grid-cols-2 lg:gap-3 lg:p-4">
          {quickActions.map(({ to, label, icon: Icon }) => (
            <Link key={label} to={to} className="flex flex-col items-center justify-center gap-2 rounded-xl p-2 text-center text-xs font-medium text-brand transition hover:bg-brand/5 lg:bg-surface lg:p-4 lg:text-sm">
              <span className="flex size-11 items-center justify-center rounded-full bg-brand/10"><Icon className="size-5" /></span>
              {label}
            </Link>
          ))}
        </section>
      </div>

      <ErrorNote error={error} />
      {loading ? <Spinner /> : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card strip title="Manage Expenses" action={<Link to="/app/activity" className="text-sm font-semibold text-brand">View all</Link>}>
              <ExpensesDonut transactions={txs} />
            </Card>
            <Card strip title="Money in vs. out">
              <CashflowChart transactions={txs} />
            </Card>
          </div>

          <Card strip title="Recent activity"
            action={<Link to="/app/activity" className="flex items-center text-sm font-semibold text-brand">See all <ChevronRight className="size-4" /></Link>}>
            <TransactionList transactions={txs.slice(0, 6)} onSelect={setSelected} compact />
          </Card>
        </>
      )}
      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
