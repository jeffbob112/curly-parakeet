import { Download, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import TransactionList from '../../components/Transactions'
import TxFilters from '../../components/TxFilters'
import { Button, Card, ErrorNote, Spinner } from '../../components/ui'
import { downloadCsv, filterTransactions } from '../../lib/filters'
import { useData } from '../../lib/hooks'
import api from '../../services/api'
import { AddTransactionModal, EditTransactionModal } from './AdminModals'

const PAGE = 50

export default function AdminTransactions() {
  const [filters, setFilters] = useState({ q: '', type: 'all', range: 'all' })
  const [shown, setShown] = useState(PAGE)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const { data, loading, error } = useData(async () => {
    const [users, txs] = await Promise.all([api.listUsers(), api.listAllTransactions()])
    return { users, txs }
  })

  const usersById = useMemo(() => Object.fromEntries((data?.users || []).map((u) => [u.uid, u])), [data])
  const owner = (t) => `${usersById[t.uid]?.fullName || ''} ${usersById[t.uid]?.email || ''}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => filterTransactions(data?.txs, filters, owner), [data, filters])

  return (
    <div className="space-y-4">
      <PageHeader title="All transactions" subtitle="Search, edit or delete any transaction."
        action={
          <div className="flex gap-2">
            <Button variant="outline" disabled={!filtered.length}
              onClick={() => downloadCsv('all-transactions.csv', filtered, [['Customer', (t) => usersById[t.uid]?.fullName]])}>
              <Download className="size-4" /> CSV
            </Button>
            <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add</Button>
          </div>
        } />
      <TxFilters value={filters} onChange={(f) => { setFilters(f); setShown(PAGE) }} />
      <ErrorNote error={error} />
      <Card strip title={`${filtered.length} transactions`}>
        {loading ? <Spinner /> : (
          <>
            <TransactionList transactions={filtered.slice(0, shown)} onSelect={setEditing} showOwner showAccount usersById={usersById} />
            {shown < filtered.length && (
              <div className="mt-4 text-center"><Button variant="ghost" onClick={() => setShown(shown + PAGE)}>Show more</Button></div>
            )}
          </>
        )}
      </Card>
      <AddTransactionModal open={adding} onClose={() => setAdding(false)} users={data?.users || []} />
      {editing && <EditTransactionModal key={editing.id} tx={editing} ownerName={usersById[editing.uid]?.fullName} onClose={() => setEditing(null)} />}
    </div>
  )
}
