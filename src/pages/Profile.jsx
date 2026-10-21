import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { Avatar, Badge, Button, Card, Field, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ACCOUNT_TYPES, accountList, ageText } from '../lib/accounts'
import { AVATAR_COLORS } from '../lib/constants'
import { shortDate } from '../lib/format'
import api from '../services/api'

export function AvatarColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVATAR_COLORS.map((c) => (
        <button type="button" key={c} onClick={() => onChange(c)} aria-label={`Color ${c}`}
          className={`flex size-9 items-center justify-center rounded-full ring-offset-2 ${value === c ? 'ring-2 ring-brand' : ''}`} style={{ background: c }}>
          {value === c && <Check className="size-4 text-white" />}
        </button>
      ))}
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '', address: user.address || '', avatarColor: user.avatarColor || AVATAR_COLORS[0] })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateProfile(user.uid, { ...form, fullName: form.fullName.trim() })
      toast('Profile updated')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const copy = async (num) => {
    await navigator.clipboard?.writeText(num)
    setCopied(num)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Profile" subtitle="Your personal and account details." />

      <Card strip>
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <Avatar name={form.fullName} color={form.avatarColor} size="lg" />
          <div className="flex-1">
            <p className="text-xl font-semibold">{user.fullName}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-1 flex justify-center gap-2 sm:justify-start">
              <Badge color="blue">{user.role === 'admin' ? 'Administrator' : 'Preferred Client'}</Badge>
              <Badge color={user.status === 'frozen' ? 'red' : 'green'}>{user.status}</Badge>
            </div>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-slate-500">Member since</dt>
            <dd className="mt-1 font-semibold">{shortDate(user.memberSince || user.createdAt)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-slate-500">Relationship age</dt>
            <dd className="mt-1 font-semibold">{ageText(user.memberSince || user.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card strip title="Your accounts">
        <ul className="divide-y divide-slate-100">
          {accountList(user).map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{ACCOUNT_TYPES[a.id].label}</span>
                <span className="font-mono text-sm text-slate-600">{a.number}</span>
                <span className="block text-xs text-slate-400">Opened {shortDate(a.openedAt)} · {ageText(a.openedAt)}</span>
              </span>
              <button onClick={() => copy(a.number)} className="rounded-lg p-2 text-brand hover:bg-slate-100" aria-label={`Copy ${ACCOUNT_TYPES[a.id].label} number`}>
                {copied === a.number ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card strip title="Edit details">
        <form onSubmit={save} className="space-y-4">
          <Field label="Full name"><Input value={form.fullName} onChange={set('fullName')} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" hint="Contact support to change your email."><Input value={user.email} disabled /></Field>
            <Field label="Phone"><Input type="tel" value={form.phone} onChange={set('phone')} /></Field>
          </div>
          <Field label="Address"><Input value={form.address} onChange={set('address')} /></Field>
          <Field label="Avatar color"><AvatarColorPicker value={form.avatarColor} onChange={(c) => setForm({ ...form, avatarColor: c })} /></Field>
          <Button type="submit" loading={saving} className="w-full sm:w-auto">Save changes</Button>
        </form>
      </Card>
    </div>
  )
}
