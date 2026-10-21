// Pay & Transfer hub (like the screenshot): option tiles + scheduled/history activity.
import { ArrowLeftRight, Banknote, ChevronRight, CreditCard, Globe, Receipt, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchBar } from './Dashboard'
import TransactionList from '../components/Transactions'
import TxDetail from '../components/TxDetail'
import { Card, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { PAYEES } from '../lib/constants'
import { useData } from '../lib/hooks'
import api from '../services/api'

export const TRANSFER_OPTIONS = [
  { id: 'between', title: 'Transfer', sub: 'between my accounts', icon: ArrowLeftRight },
  { id: 'send', title: 'Send money', sub: 'send or receive', icon: Send },
  { id: 'bill', title: 'Pay Bills', sub: 'pay now', icon: Receipt },
  { id: 'wire', title: 'Wire', sub: 'U.S. or international', icon: Globe },
  { id: 'card', title: 'Pay card or loan', sub: 'credit card, home equity', icon: CreditCard },
  { id: 'withdraw', title: 'Withdraw', sub: 'cash from ATM', icon: Banknote },
]

const MOVES = ['transfer_out', 'transfer_in', 'payment', 'wire', 'withdrawal']

export default function PayTransfer() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const { data: txs, loading } = useData(() => api.listTransactions(user.uid), [user.uid])
  const history = useMemo(() => (txs || []).filter((t) => MOVES.includes(t.type) && t.direction === 'debit').slice(0, 15), [txs])

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <SearchBar />
      <section className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-3">
        {TRANSFER_OPTIONS.map(({ id, title, sub, icon: Icon }) => (
          <Link key={id} to={`/app/transfer/${id}`}
            className="flex flex-col items-center gap-1 border-b border-r border-slate-100 p-5 text-center transition hover:bg-brand/5">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon className="size-6" /></span>
            <span className="mt-1 font-semibold text-brand">{title}</span>
            <span className="text-xs text-slate-500">{sub}</span>
          </Link>
        ))}
      </section>

      <Card strip title="Pay a saved payee">
        <ul className="divide-y divide-slate-100">
          {PAYEES.slice(0, 4).map((p) => (
            <li key={p.name}>
              <Link to={`/app/transfer/bill?payee=${encodeURIComponent(p.name)}`} className="flex items-center gap-3 py-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">{p.name[0]}</span>
                <span className="flex-1"><span className="block font-medium">{p.name}</span><span className="text-xs text-slate-500">{p.category} · {p.account}</span></span>
                <span className="rounded-full border border-brand px-3 py-1 text-xs font-semibold text-brand">PAY</span>
                <ChevronRight className="size-4 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card strip title="Activity">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
        {loading ? <Spinner /> : <TransactionList transactions={history} onSelect={setSelected} showAccount compact />}
        <Link to="/app/activity?type=out" className="mt-2 block text-center text-sm font-semibold text-brand">See all activity</Link>
      </Card>
      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
