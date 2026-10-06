import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import TransactionList from '../components/Transactions'
import TxDetail from '../components/TxDetail'
import TxFilters from '../components/TxFilters'
import { Button, Card, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { downloadCsv, filterTransactions } from '../lib/filters'
import { money } from '../lib/format'
import { useData } from '../lib/hooks'
import api from '../services/api'

export default function Activity() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ q: params.get('q') || '', type: 'all', range: 'all' })
  const [selected, setSelected] = useState(null)
  const { data: txs, loading, error } = useData(() => api.listTransactions(user.uid), [user.uid])

  const filtered = useMemo(() => filterTransactions(txs, filters), [txs, filters])
  const totals = useMemo(() => filtered.reduce((s, t) => {
    s[t.direction] += t.amount
    return s
  }, { credit: 0, debit: 0 }), [filtered])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Activity"
        subtitle="Every deposit, withdrawal, payment and transfer."
        action={<Button variant="outline" onClick={() => downloadCsv('transactions.csv', filtered)} disabled={!filtered.length}><Download className="size-4" /> Export CSV</Button>}
      />
      <div className="mb-4"><TxFilters value={filters} onChange={setFilters} /></div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
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
        {loading ? <Spinner /> : <TransactionList transactions={filtered} onSelect={setSelected} />}
      </Card>
      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
