import { ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CashflowChart, ExpensesDonut } from '../../components/Charts'
import TransactionList from '../../components/Transactions'
import { AmountInput, Avatar, Badge, Button, Card, ErrorNote, Field, Input, Select, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { money, shortDate } from '../../lib/format'
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
  const [shown, setShown] = useState(20)

  if (loading) return <Spinner />
  if (!data?.user) return <ErrorNote error={error || 'Customer not found.'} />
  const { user, txs } = data

  return (
    <div className="space-y-4">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft className="size-4" /> All customers</Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.fullName} color={user.avatarColor} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-slate-500">{user.email} · Acct {user.accountNumber} · Joined {shortDate(user.createdAt)}</p>
          <div className="mt-1 flex gap-2">
            <Badge color={user.role === 'admin' ? 'blue' : 'slate'}>{user.role}</Badge>
            <Badge color={user.status === 'frozen' ? 'red' : 'green'}>{user.status}</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Balance</p>
          <p className="text-3xl font-bold tabular-nums text-brand">{money(user.balance)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* key forces the form to refresh when the saved data changes */}
        <ProfileEditor key={`p-${user.updatedAt}`} user={user} />
        <BalanceEditor key={`b-${user.updatedAt}`} user={user} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card strip title="Spending (30 days)"><ExpensesDonut transactions={txs} /></Card>
        <Card strip title="Money in vs. out"><CashflowChart transactions={txs} /></Card>
      </div>

      <Card strip title={`Transactions (${txs.length})`}
        action={<Button onClick={() => setAdding(true)} className="!min-h-9 !px-3"><Plus className="size-4" /> Add</Button>}>
        <p className="mb-2 text-xs text-slate-500">Tap a transaction to edit or delete it.</p>
        <TransactionList transactions={txs.slice(0, shown)} onSelect={setEditing} />
        {shown < txs.length && (
          <div className="mt-4 text-center"><Button variant="ghost" onClick={() => setShown(shown + 20)}>Show more</Button></div>
        )}
      </Card>

      <AddTransactionModal open={adding} onClose={() => setAdding(false)} uid={uid} />
      {editing && <EditTransactionModal key={editing.id} tx={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ProfileEditor({ user }) {
  const toast = useToast()
  const { user: me } = useAuth()
  const [form, setForm] = useState({
    fullName: user.fullName, phone: user.phone || '', address: user.address || '',
    role: user.role, status: user.status, avatarColor: user.avatarColor,
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
      await api.adminUpdateUser(user.uid, form)
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
          <Field label="Address"><Input value={form.address} onChange={set('address')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" hint="Frozen accounts can't move money.">
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

function BalanceEditor({ user }) {
  const toast = useToast()
  const { user: admin } = useAuth()
  const [target, setTarget] = useState(String(user.balance))
  const [months, setMonths] = useState('6')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const diff = useMemo(() => Math.round((Number(target) - user.balance) * 100) / 100, [target, user.balance])

  const run = async (name, fn, msg) => {
    setBusy(name)
    setError(null)
    try {
      await fn()
      toast(msg)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card strip title="Balance">
      <div className="space-y-4">
        <Field label="Set balance to" hint="An adjustment transaction is recorded for the difference, so history always adds up.">
          <AmountInput value={target} onChange={(e) => setTarget(e.target.value)} min="0" />
        </Field>
        {Number.isFinite(diff) && diff !== 0 && (
          <p className="text-sm">
            This will <strong className={diff > 0 ? 'text-green-700' : 'text-accent'}>{diff > 0 ? 'credit' : 'debit'} {money(Math.abs(diff))}</strong>.
          </p>
        )}
        <Button loading={busy === 'set'} disabled={!diff || !Number.isFinite(diff)}
          onClick={() => run('set', () => api.adminSetBalance(admin.uid, user.uid, target), 'Balance updated')}>
          Update balance
        </Button>

        <div className="rounded-xl bg-surface p-4">
          <p className="font-medium">Populate with sample history</p>
          <p className="mb-3 text-sm text-slate-500">Adds realistic paychecks, bills and purchases so the charts have data.</p>
          <div className="flex gap-2">
            <div className="w-36">
              <Select value={months} onChange={(e) => setMonths(e.target.value)} aria-label="Months of history">
                {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
              </Select>
            </div>
            <Button variant="outline" loading={busy === 'gen'}
              onClick={() => run('gen', () => api.adminGenerateHistory(admin.uid, user.uid, Number(months)), 'Sample history added')}>
              <Sparkles className="size-4" /> Generate
            </Button>
          </div>
        </div>
        <ErrorNote error={error} />
      </div>
    </Card>
  )
}
