// Admin dialogs: add a transaction, and edit/delete a transaction.
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AmountInput, Button, ErrorNote, Field, Input, Modal, Select } from '../../components/ui'
import { TxAmount, TxTypeBadge } from '../../components/Transactions'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { CREDIT_CATEGORIES, DEBIT_CATEGORIES } from '../../lib/constants'
import { fromDateInput, money, toDateInput } from '../../lib/format'
import api from '../../services/api'

const ADD_TYPES = [
  { type: 'deposit', direction: 'credit', label: 'Deposit (credit)' },
  { type: 'transfer_in', direction: 'credit', label: 'Incoming transfer (credit)' },
  { type: 'adjustment', direction: 'credit', label: 'Adjustment (credit)' },
  { type: 'withdrawal', direction: 'debit', label: 'Withdrawal (debit)' },
  { type: 'payment', direction: 'debit', label: 'Payment (debit)' },
  { type: 'transfer_out', direction: 'debit', label: 'Outgoing transfer (debit)' },
  { type: 'adjustment', direction: 'debit', label: 'Adjustment (debit)' },
]

// users: list to pick from (optional). uid: fixed customer (optional).
export function AddTransactionModal({ open, onClose, uid: fixedUid, users = [] }) {
  const { user: admin } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ uid: '', kind: '0', amount: '', description: '', category: 'Deposit', date: toDateInput(Date.now()), counterparty: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const kind = ADD_TYPES[Number(form.kind)]
  const categories = kind.direction === 'credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const uid = fixedUid || form.uid
      if (!uid) throw new Error('Choose a customer.')
      await api.adminAddTransaction(admin.uid, uid, {
        type: kind.type, direction: kind.direction, amount: form.amount,
        description: form.description || ADD_TYPES[Number(form.kind)].label.split(' (')[0],
        category: categories.includes(form.category) ? form.category : categories[0],
        createdAt: fromDateInput(form.date),
      })
      toast('Transaction added')
      setForm({ ...form, amount: '', description: '' })
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add transaction">
      <form onSubmit={submit} className="space-y-4">
        {!fixedUid && (
          <Field label="Customer">
            <Select value={form.uid} onChange={set('uid')} required>
              <option value="">Select a customer…</option>
              {users.map((u) => <option key={u.uid} value={u.uid}>{u.fullName} — {u.email}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Type">
          <Select value={form.kind} onChange={(e) => {
            const k = ADD_TYPES[Number(e.target.value)]
            setForm({ ...form, kind: e.target.value, category: k.direction === 'credit' ? 'Deposit' : 'Other' })
          }}>
            {ADD_TYPES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Amount"><AmountInput value={form.amount} onChange={set('amount')} required /></Field>
        <Field label="Description"><Input value={form.description} onChange={set('description')} placeholder="e.g. Payroll - Acme Corp" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category} onChange={set('category')}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Date" hint="Backdate to fill history">
            <Input type="date" value={form.date} max={toDateInput(Date.now())} onChange={set('date')} required />
          </Field>
        </div>
        <p className="text-xs text-slate-500">The customer's balance is updated automatically.</p>
        <ErrorNote error={error} />
        <Button type="submit" loading={saving} className="w-full">Add transaction</Button>
      </form>
    </Modal>
  )
}

// Render it as {tx && <EditTransactionModal key={tx.id} tx={tx} … />} so each transaction gets a fresh form.
export function EditTransactionModal({ tx, onClose, ownerName }) {
  const toast = useToast()
  const [form, setForm] = useState({ description: tx.description, category: tx.category, date: toDateInput(tx.createdAt), status: tx.status })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categories = tx.direction === 'credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.adminUpdateTransaction(tx.id, {
        description: form.description, category: form.category, status: form.status,
        // keep the original time of day when only the date changes
        createdAt: form.date === toDateInput(tx.createdAt) ? tx.createdAt : fromDateInput(form.date),
      })
      toast('Transaction updated')
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await api.adminDeleteTransaction(tx.id)
      toast('Transaction deleted and balance reversed')
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit transaction">
      <div className="mb-4 flex items-center justify-between rounded-xl bg-surface p-3">
        <div>
          <TxTypeBadge type={tx.type} />
          {ownerName && <p className="mt-1 text-sm text-slate-600">{ownerName}</p>}
        </div>
        <span className="text-xl"><TxAmount tx={tx} /></span>
      </div>
      <form onSubmit={save} className="space-y-4">
        <Field label="Description"><Input value={form.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category} onChange={set('category')}>
              {[...new Set([form.category, ...categories])].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="completed">completed</option>
              <option value="pending">pending</option>
            </Select>
          </Field>
        </div>
        <Field label="Date"><Input type="date" value={form.date} onChange={set('date')} required /></Field>
        <p className="text-xs text-slate-500">To change the amount, delete this transaction and add a new one — that keeps the balance correct.</p>
        <ErrorNote error={error} />
        <Button type="submit" loading={saving} className="w-full">Save changes</Button>
      </form>
      <div className="mt-4 border-t border-slate-100 pt-4">
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Delete this transaction? The customer's balance will be {tx.direction === 'credit' ? 'reduced' : 'increased'} by <strong>{money(tx.amount)}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button>
              <Button variant="accent" loading={saving} onClick={remove}>Yes, delete</Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /> Delete transaction</Button>
        )}
      </div>
    </Modal>
  )
}
