import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import TransactionList from '../components/Transactions'
import TxDetail from '../components/TxDetail'
import TxFilters from '../components/TxFilters'
import { Button, Card, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { accountList } from '../lib/accounts'
import { downloadCsv, filterTransactions } from '../lib/filters'
import { money } from '../lib/format'
import { useData } from '../lib/hooks'
import api from '../services/api'

const PAGE = 60

export default function Activity() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ q: params.get('q') || '', type: 'all', range: '365', account: params.get('account') || 'all' })
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState(null)
  const { data: txs, loading, error } = useData(() => api.listTransactions(user.uid), [user.uid])

  const filtered = useMemo(() => filterTransactions(txs, filters), [txs, filters])
  const totals = useMemo(() => filtered.reduce((s, t) => {
    if (!t.internal) s[t.direction] += t.amount
    return s
  }, { credit: 0, debit: 0 }), [filtered])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Activity"
        subtitle="Transaction history across all your accounts."
        action={<Button variant="outline" onClick={() => downloadCsv('transactions.csv', filtered)} disabled={!filtered.length}><Download className="size-4" /> Export CSV</Button>}
      />
      <div className="mb-3"><TxFilters value={filters} onChange={(f) => { setFilters(f); setShown(PAGE) }} accounts={accountList(user)} /></div>

      <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-4">
        {[
          ['Money in', totals.credit, 'text-green-700'],
          ['Money out', totals.debit, 'text-slate-900'],
          ['Net', totals.credit - totals.debit, totals.credit - totals.debit >= 0 ? 'text-green-700' : 'text-accent'],
        ].map(([label, value, cls]) => (
          <div key={label} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:p-4">
            <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
            <p className={`truncate font-bold tabular-nums sm:text-xl ${cls}`}>{money(value)}</p>
          </div>
        ))}
      </div>

      <Card strip title={`${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`}>
        <ErrorNote error={error} />
        {loading ? <Spinner /> : (
          <>
            <TransactionList transactions={filtered.slice(0, shown)} onSelect={setSelected} showAccount />
            {shown < filtered.length && <div className="mt-4 text-center"><Button variant="ghost" onClick={() => setShown(shown + PAGE)}>Show more</Button></div>}
          </>
        )}
      </Card>
      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
