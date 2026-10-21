import { ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExpenseTrendChart, ExpensesDonut } from '../../components/Charts'
import TransactionList from '../../components/Transactions'
import TxFilters from '../../components/TxFilters'
import { Avatar, Badge, Button, Card, ErrorNote, Field, Input, Select, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ACCOUNT_ORDER, ACCOUNT_TYPES, accountList, accountValue, ageText, isLiability, netWorth } from '../../lib/accounts'
import { filterTransactions } from '../../lib/filters'
import { fromDateInput, money, shortDate, toDateInput } from '../../lib/format'
import { useData } from '../../lib/hooks'
import api from '../../services/api'
import { AvatarColorPicker } from '../Profile'
import { AddTransactionModal, EditTransactionModal } from './AdminModals'

export default function AdminUserDetail() {
  const { uid } = useParams()
  const { data, loading, error } = useData(async () => {
    const [user, txs] = await Promise.all([api.getUser(uid), api.listTransactions(uid)])
    return { user, txs }
  }, [uid])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filters, setFilters] = useState({ q: '', type: 'all', range: 'all', account: 'all' })
  const [shown, setShown] = useState(25)

  if (loading) return <Spinner />
  if (!data?.user) return <ErrorNote error={error || 'Customer not found.'} />
  const { user, txs } = data
  const filtered = filterTransactions(txs, filters)

  return (
    <div className="space-y-4">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft className="size-4" /> All customers</Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.fullName} color={user.avatarColor} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-slate-500">{user.email} · Member since {shortDate(user.memberSince || user.createdAt)} ({ageText(user.memberSince || user.createdAt)})</p>
          <div className="mt-1 flex gap-2">
            <Badge color={user.role === 'admin' ? 'blue' : 'slate'}>{user.role}</Badge>
            <Badge color={user.status === 'frozen' ? 'red' : 'green'}>{user.status}</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Net worth</p>
          <p className="text-3xl font-bold tabular-nums text-brand">{money(netWorth(user))}</p>
        </div>
      </div>

      <AccountsEditor key={`a-${user.updatedAt}`} user={user} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileEditor key={`p-${user.updatedAt}`} user={user} />
        <div className="space-y-4">
          <HistoryGenerator user={user} />
          <Card strip title="Spending (30 days)"><ExpensesDonut transactions={txs} /></Card>
        </div>
      </div>
      <Card strip title="Monthly expenses (12 months)"><ExpenseTrendChart transactions={txs} months={12} /></Card>

      <Card strip title={`Transactions (${filtered.length})`}
        action={<Button onClick={() => setAdding(true)} className="!min-h-9 !px-3"><Plus className="size-4" /> Add</Button>}>
        <div className="mb-3"><TxFilters value={filters} onChange={(f) => { setFilters(f); setShown(25) }} accounts={accountList(user)} /></div>
        <p className="mb-2 text-xs text-slate-500">Tap a transaction to edit or delete it.</p>
        <TransactionList transactions={filtered.slice(0, shown)} onSelect={setEditing} showAccount />
        {shown < filtered.length && <div className="mt-4 text-center"><Button variant="ghost" onClick={() => setShown(shown + 25)}>Show more</Button></div>}
      </Card>

      <AddTransactionModal open={adding} onClose={() => setAdding(false)} uid={uid} users={[user]} />
      {editing && <EditTransactionModal key={editing.id} tx={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

// One row per account product: open/close, set balance, credit limit, opened date.
function AccountsEditor({ user }) {
  return (
    <Card strip title="Accounts">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ACCOUNT_ORDER.map((id) => <AccountCard key={id} user={user} id={id} />)}
      </div>
    </Card>
  )
}

function AccountCard({ user, id }) {
  const { user: admin } = useAuth()
  const toast = useToast()
  const acc = user.accounts?.[id]
  const open = acc && acc.status !== 'closed'
  const t = ACCOUNT_TYPES[id]
  const [balance, setBalance] = useState(acc ? String(acc.balance) : '0')
  const [limit, setLimit] = useState(acc?.creditLimit ? String(acc.creditLimit) : '')
  const [opened, setOpened] = useState(acc ? toDateInput(acc.openedAt) : toDateInput(Date.now()))
  const [busy, setBusy] = useState(false)

  const run = async (fn, msg) => {
    setBusy(true)
    try {
      await fn()
      toast(msg)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-4">
        <div><p className="font-medium">{t.label}</p><p className="text-sm text-slate-500">{t.group} · not open</p></div>
        <Button variant="outline" loading={busy} onClick={() => run(() => api.adminUpdateAccount(user.uid, id, { status: 'open' }), `${t.label} opened`)}>Open account</Button>
      </div>
    )
  }

  const changed = Number(balance) !== acc.balance
  return (
    <div className="space-y-3 rounded-xl bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{t.label}</p>
          <p className="font-mono text-xs text-slate-500">{acc.number}</p>
        </div>
        <p className="text-right font-semibold tabular-nums">{money(accountValue(acc))}<span className="block text-xs font-normal text-slate-500">{isLiability(acc) ? 'owed' : id === 'inv' ? 'incl. stocks' : 'balance'}</span></p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={isLiability(acc) ? 'Balance owed' : id === 'inv' ? 'Cash balance' : 'Balance'}>
          <Input type="number" step="0.01" min="0" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
        {isLiability(acc) ? (
          <Field label="Credit limit"><Input type="number" step="100" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} /></Field>
        ) : (
          <Field label="Opened on"><Input type="date" value={opened} max={toDateInput(Date.now())} onChange={(e) => setOpened(e.target.value)} /></Field>
        )}
      </div>
      {isLiability(acc) && <Field label="Opened on"><Input type="date" value={opened} max={toDateInput(Date.now())} onChange={(e) => setOpened(e.target.value)} /></Field>}
      <p className="text-xs text-slate-500">Open {ageText(acc.openedAt)}. Balance changes are recorded as adjustments.</p>
      <div className="flex flex-wrap gap-2">
        <Button className="!min-h-9 flex-1 !px-3" loading={busy} onClick={() => run(async () => {
          if (changed) await api.adminSetBalance(admin.uid, user.uid, id, balance)
          const patch = { openedAt: fromDateInput(opened) }
          if (isLiability(acc) && limit !== '') patch.creditLimit = Number(limit)
          await api.adminUpdateAccount(user.uid, id, patch)
        }, `${t.label} updated`)}>Save</Button>
        <Button variant="danger" className="!min-h-9 !px-3" loading={busy}
          onClick={() => window.confirm(`Close ${t.label}? The balance must be $0.`) && run(() => api.adminUpdateAccount(user.uid, id, { status: 'closed' }), `${t.label} closed`)}>
          Close
        </Button>
      </div>
    </div>
  )
}

function ProfileEditor({ user }) {
  const toast = useToast()
  const { user: me } = useAuth()
  const [form, setForm] = useState({
    fullName: user.fullName, phone: user.phone || '', address: user.address || '',
    role: user.role, status: user.status, avatarColor: user.avatarColor, memberSince: toDateInput(user.memberSince || user.createdAt),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const isMe = me.uid === user.uid

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.adminUpdateUser(user.uid, { ...form, memberSince: fromDateInput(form.memberSince) })
      toast('Customer updated')
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card strip title="Profile">
      <form onSubmit={save} className="space-y-4">
        <Field label="Full name"><Input value={form.fullName} onChange={set('fullName')} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Member since" hint={`Relationship age: ${ageText(fromDateInput(form.memberSince))}`}>
            <Input type="date" value={form.memberSince} max={toDateInput(Date.now())} onChange={set('memberSince')} />
          </Field>
        </div>
        <Field label="Address"><Input value={form.address} onChange={set('address')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" hint="Frozen profiles can't move money.">
            <Select value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
            </Select>
          </Field>
          <Field label="Role" hint={isMe ? "You can't demote yourself." : 'Admins can open this dashboard.'}>
            <Select value={form.role} onChange={set('role')} disabled={isMe}>
              <option value="user">Customer</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
        </div>
        <Field label="Avatar color"><AvatarColorPicker value={form.avatarColor} onChange={(c) => setForm({ ...form, avatarColor: c })} /></Field>
        <ErrorNote error={error} />
        <Button type="submit" loading={saving}>Save profile</Button>
      </form>
    </Card>
  )
}

function HistoryGenerator({ user }) {
  const toast = useToast()
  const { user: admin } = useAuth()
  const [months, setMonths] = useState('6')
  const [busy, setBusy] = useState(false)
  return (
    <Card strip title="Populate with sample history">
      <p className="mb-3 text-sm text-slate-500">Adds realistic paychecks, bills, card purchases, payments to and from people, savings and loan payments across their open accounts.</p>
      <div className="flex gap-2">
        <div className="w-36">
          <Select value={months} onChange={(e) => setMonths(e.target.value)} aria-label="Months of history">
            {[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
          </Select>
        </div>
        <Button variant="outline" loading={busy} onClick={async () => {
          setBusy(true)
          try {
            await api.adminGenerateHistory(admin.uid, user.uid, Number(months))
            toast('Sample history added')
          } catch (err) {
            toast(err.message, 'error')
          } finally {
            setBusy(false)
          }
        }}><Sparkles className="size-4" /> Generate</Button>
      </div>
    </Card>
  )
}
