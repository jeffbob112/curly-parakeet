import { Award, ChevronRight, Eye, EyeOff, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AccountSections from '../components/AccountSections'
import { CashflowChart, ExpenseTrendChart, ExpensesDonut, MoneyFlowChart } from '../components/Charts'
import Logo from '../components/Logo'
import TransactionList from '../components/Transactions'
import TxDetail from '../components/TxDetail'
import { Card, ErrorNote, Modal, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { accountList, accountValue, ageText, isLiability, netWorth } from '../lib/accounts'
import { money, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import api from '../services/api'

// Simple rewards rule: 1.5 points per $1 spent on the credit card.
export const rewardsPoints = (txs) => Math.floor(txs.filter((t) => t.accountId === 'cc' && t.type === 'purchase').reduce((s, t) => s + t.amount, 0) * 1.5)

export function SearchBar({ placeholder = 'How can we help?' }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  return (
    <form onSubmit={(e) => { e.preventDefault(); navigate(`/app/activity?q=${encodeURIComponent(q)}`) }} className="flex items-center gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search"
        className="h-11 min-w-0 flex-1 rounded-full bg-slate-100 px-4 text-base outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-brand/30 sm:text-sm" />
      <button className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent" aria-label="Search">
        <svg viewBox="0 0 64 64" className="size-6"><path d="M10 40c12-4 24-17 44-26-8 13-18 26-38 31z" fill="#fff" /><path d="M10 30c9-3 19-10 34-17-6 8-14 16-30 20z" fill="#fff" opacity=".7" /></svg>
      </button>
    </form>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'dashboard' ? 'dashboard' : 'accounts'
  const [hide, setHide] = useState(false)
  const [selected, setSelected] = useState(null)
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const { data: txs, loading, error } = useData(() => api.listTransactions(user.uid), [user.uid])
  const points = useMemo(() => rewardsPoints(txs || []), [txs])
  const accounts = accountList(user)
  const assets = accounts.filter((a) => !isLiability(a))
  const debts = accounts.filter(isLiability)

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      {/* Accounts | Dashboard tabs */}
      <div className="-mx-3 -mt-3 flex border-b border-slate-200 bg-white sm:mx-0 sm:mt-0 sm:rounded-xl sm:border">
        {[['accounts', 'Accounts'], ['dashboard', 'Dashboard']].map(([id, label]) => (
          <button key={id} onClick={() => setParams(id === 'accounts' ? {} : { tab: id })}
            className={`flex-1 py-3 text-sm font-semibold transition ${tab === id ? 'border-b-2 border-accent text-slate-900' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      <SearchBar />
      {user.status === 'frozen' && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Your profile is frozen. Payments and transfers are disabled. Please contact support.</p>
      )}
      <ErrorNote error={error} />

      {tab === 'accounts' ? (
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3">
            {/* Hello card */}
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
              <Link to="/app/profile" className="flex items-center justify-between px-4 pt-4 sm:px-5">
                <span>
                  <span className="block text-xl font-semibold">Hello, {user.fullName.split(' ')[0]}</span>
                  <span className="text-sm text-slate-500">Preferred Client · Member {ageText(user.memberSince || user.createdAt)}</span>
                </span>
                <ChevronRight className="size-5 text-slate-400" />
              </Link>
              <button onClick={() => setRewardsOpen(true)} className="mt-3 flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5">
                <span className="flex items-center gap-2 font-medium"><Award className="size-5 text-accent" /> My Rewards</span>
                <span className="flex items-center gap-1 text-sm text-slate-600">{points.toLocaleString()} pts <ChevronRight className="size-5 text-slate-400" /></span>
              </button>
            </section>

            {/* Net worth strip */}
            <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-light p-4 text-white shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Net worth</span>
                <button onClick={() => setHide(!hide)} className="rounded-full p-1.5 hover:bg-white/10" aria-label={hide ? 'Show balances' : 'Hide balances'}>
                  {hide ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold tabular-nums">{hide ? '$ ••••••' : money(netWorth(user))}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-white/10 p-2.5"><p className="text-white/70">You have</p><p className="font-semibold">{hide ? '••••' : money(assets.reduce((s, a) => s + accountValue(a), 0))}</p></div>
                <div className="rounded-xl bg-white/10 p-2.5"><p className="text-white/70">You owe</p><p className="font-semibold">{hide ? '••••' : money(debts.reduce((s, a) => s + a.balance, 0))}</p></div>
              </div>
            </section>

            <Card strip title="Manage Expenses" action={<Link to="/app/expenses" className="text-xs font-bold uppercase tracking-wide text-brand">View all expenses</Link>}>
              {loading ? <Spinner /> : <ExpensesDonut transactions={txs} />}
            </Card>
          </div>

          <div className={`space-y-3 ${hide ? '[&_.tabular-nums]:blur-sm' : ''}`}>
            <AccountSections user={user} />
            <Link to="/app/products" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-brand hover:border-brand">
              <Plus className="size-4" /> Open a new account
            </Link>
          </div>

          <Card strip title="Recent activity" className="lg:col-span-2"
            action={<Link to="/app/activity" className="flex items-center text-sm font-semibold text-brand">See all <ChevronRight className="size-4" /></Link>}>
            {loading ? <Spinner /> : <TransactionList transactions={txs.slice(0, 8)} onSelect={setSelected} showAccount compact />}
          </Card>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {loading ? <Spinner /> : (
            <>
              <Card strip title="Monthly expenses (12 months)" className="lg:col-span-2"
                action={<Link to="/app/expenses" className="text-sm font-semibold text-brand">More history</Link>}>
                <ExpenseTrendChart transactions={txs} months={12} />
              </Card>
              <Card strip title="Where your money went (30 days)"><MoneyFlowChart transactions={txs} days={30} /></Card>
              <Card strip title="Money in vs. out"><CashflowChart transactions={txs} months={6} /></Card>
            </>
          )}
        </div>
      )}

      <TxDetail tx={selected} onClose={() => setSelected(null)} />
      <Modal open={rewardsOpen} onClose={() => setRewardsOpen(false)} title="My Rewards">
        <div className="text-center">
          <Logo className="mb-3" />
          <p className="text-4xl font-bold text-brand">{points.toLocaleString()}</p>
          <p className="text-sm text-slate-500">points earned on your Visa card</p>
          <p className="mt-2 text-sm">Worth about <strong>{money(points / 100)}</strong> in cash back</p>
          <p className="mt-4 rounded-xl bg-surface p-3 text-xs text-slate-500">Earn 1.5 points for every $1 spent on your Customized Cash Rewards Visa. Points as of {shortDate(Date.now())}.</p>
        </div>
      </Modal>
    </div>
  )
}
