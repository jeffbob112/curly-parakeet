import { ArrowLeft, ArrowLeftRight, Camera, Check, Copy, CreditCard, Eye, EyeOff, LineChart, Receipt, Send, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BalanceChart } from '../components/Charts'
import TransactionList from '../components/Transactions'
import TxDetail from '../components/TxDetail'
import TxFilters from '../components/TxFilters'
import { Card, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { ACCOUNT_TYPES, ROUTING_NUMBER, accountValue, ageText, available, isLiability, minimumPayment, paymentDueDate } from '../lib/accounts'
import { filterTransactions } from '../lib/filters'
import { money, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import api from '../services/api'

const ACTIONS = {
  chk: [['Transfer', '/app/transfer/between', ArrowLeftRight], ['Send', '/app/transfer/send', Send], ['Pay bills', '/app/transfer/bill', Receipt], ['Deposit', '/app/deposit', Camera]],
  sav: [['Transfer', '/app/transfer/between?from=sav', ArrowLeftRight], ['Deposit', '/app/deposit?to=sav', Camera], ['Withdraw', '/app/transfer/withdraw?from=sav', Wallet]],
  cc: [['Pay card', '/app/transfer/card', CreditCard], ['Statements', '/app/activity?account=cc', Receipt]],
  heloc: [['Draw funds', '/app/transfer/between?from=heloc&to=chk', ArrowLeftRight], ['Make payment', '/app/transfer/card?to=heloc', CreditCard]],
  inv: [['Trade', '/app/invest', LineChart], ['Add cash', '/app/transfer/between?to=inv', ArrowLeftRight]],
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-white/70">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export default function AccountDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const acc = user.accounts?.[id]
  const [showNum, setShowNum] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({ q: '', type: 'all', range: '90' })
  const { data: all, loading, error } = useData(() => api.listTransactions(user.uid), [user.uid])
  const txs = useMemo(() => (all || []).filter((t) => t.accountId === id), [all, id])
  const filtered = useMemo(() => filterTransactions(txs, filters), [txs, filters])

  if (!acc || acc.status === 'closed') return <Navigate to="/app" replace />
  const t = ACCOUNT_TYPES[id]
  const liability = isLiability(acc)

  const copy = async () => {
    await navigator.clipboard?.writeText(acc.number)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <Link to="/app" className="inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft className="size-4" /> Accounts</Link>

      <section className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${id === 'cc' ? 'bg-gradient-to-br from-accent to-rose-900' : 'bg-gradient-to-br from-brand to-brand-light'}`}>
        <div className="absolute -right-12 -top-12 size-44 rounded-full bg-white/5" />
        <p className="text-sm text-white/80">{t.label}</p>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="font-mono tracking-wider">{showNum ? acc.number : `${t.short} •••• ${String(acc.number).slice(-4)}`}</span>
          <button onClick={() => setShowNum(!showNum)} className="rounded p-1 hover:bg-white/10" aria-label={showNum ? 'Hide number' : 'Show number'}>{showNum ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          <button onClick={copy} className="rounded p-1 hover:bg-white/10" aria-label="Copy number">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button>
        </div>
        <p className="mt-4 text-4xl font-bold tabular-nums">{money(accountValue(acc))}</p>
        <p className="text-sm text-white/70">{liability ? 'Current balance owed' : id === 'inv' ? 'Total account value' : 'Available balance'}</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          {liability ? (
            <>
              <Fact label="Available credit" value={money(available(acc))} />
              <Fact label="Credit limit" value={money(acc.creditLimit)} />
              <Fact label="Minimum payment" value={money(minimumPayment(acc))} />
              <Fact label="Payment due" value={acc.balance > 0 ? shortDate(paymentDueDate()) : '—'} />
              <Fact label="APR" value={`${t.apr}%`} />
            </>
          ) : id === 'inv' ? (
            <>
              <Fact label="Cash available" value={money(acc.balance)} />
              <Fact label="Holdings" value={money(accountValue(acc) - acc.balance)} />
            </>
          ) : (
            <>
              <Fact label="Routing number" value={ROUTING_NUMBER} />
              {t.apy && <Fact label="Interest rate" value={`${t.apy}% APY`} />}
            </>
          )}
          <Fact label="Opened" value={shortDate(acc.openedAt)} />
          <Fact label="Account age" value={ageText(acc.openedAt)} />
        </dl>
      </section>

      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
        {(ACTIONS[id] || []).map(([label, to, Icon]) => (
          <Link key={label} to={to} className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center text-xs font-medium text-brand hover:bg-brand/5">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand/10"><Icon className="size-5" /></span>
            {label}
          </Link>
        ))}
      </div>

      <ErrorNote error={error} />
      <Card strip title={liability ? 'Balance owed (6 months)' : 'Balance history (6 months)'}>
        {loading ? <Spinner /> : <BalanceChart transactions={txs} accountId={id} color={liability ? '#e11d48' : '#0b2a5b'} />}
      </Card>

      <Card strip title="Transactions">
        <div className="mb-3"><TxFilters value={filters} onChange={setFilters} /></div>
        {loading ? <Spinner /> : <TransactionList transactions={filtered} onSelect={setSelected} />}
      </Card>
      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
