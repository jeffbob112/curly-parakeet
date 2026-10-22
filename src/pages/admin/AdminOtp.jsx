// Admin → Security codes: customers' one-time passcode requests, live.
// Generate a code, then send it to the customer (SMS / WhatsApp / copy and read it out).
import { Check, Copy, KeyRound, MessageCircle, MessageSquare, RefreshCw, ShieldOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Avatar, Badge, Button, Card, EmptyState } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api from '../../services/api'

const ago = (ms, now) => {
  const s = Math.max(0, Math.floor((now - ms) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(ms).toLocaleDateString()
}
const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`
const digitsOnly = (p) => (p || '').replace(/\D/g, '')
const message = (code) => `Parakeet Bank: ${code} is your verification code. It expires in 10 minutes. Never share this code with anyone.`

// Live list of OTP requests (shared with the overview page).
export function useOtpRequests() {
  const [list, setList] = useState(null)
  useEffect(() => api.watchOtps(setList), [])
  return list
}

function statusOf(o, now) {
  if (o.status === 'sent' && o.expiresAt <= now) return ['expired', 'slate']
  return { pending: ['waiting for code', 'amber'], sent: ['code sent', 'blue'], verified: ['verified', 'green'], revoked: ['revoked', 'red'] }[o.status] || [o.status, 'slate']
}

function OtpRow({ o, now }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [label, color] = statusOf(o, now)
  const live = o.status === 'sent' && o.expiresAt > now && o.code

  const run = async (fn, msg) => {
    setBusy(true)
    try {
      await fn()
      if (msg) toast(msg)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    await navigator.clipboard?.writeText(o.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <li className={`rounded-2xl p-4 ring-1 ${o.status === 'pending' ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200'}`}>
      <div className="flex items-start gap-3">
        <Avatar name={o.fullName} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">{o.fullName} <Badge color={color}>{label}</Badge>{o.selfIssued && <Badge color="blue">admin self sign-in</Badge>}</p>
          <p className="truncate text-sm text-slate-600">{o.email}{o.phone && ` · ${o.phone}`}</p>
          <p className="text-xs text-slate-400">Requested {ago(o.requestedAt, now)}{o.verifiedAt && o.status === 'verified' ? ` · verified ${ago(o.verifiedAt, now)}` : ''}</p>
        </div>
      </div>

      {live && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-brand p-3 text-white">
          <span className="font-mono text-3xl font-bold tracking-[0.3em]">{o.code}</span>
          <span className="text-xs text-white/70">expires in {mmss(o.expiresAt - now)}</span>
          <button onClick={copy} className="ml-auto flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {o.status !== 'verified' && !o.selfIssued && (
          <Button className="!min-h-9 !px-3" loading={busy} onClick={() => run(() => api.adminIssueOtp(o.uid), 'Code generated. Send it to the customer.')}>
            {live ? <><RefreshCw className="size-4" /> New code</> : <><KeyRound className="size-4" /> Generate code</>}
          </Button>
        )}
        {live && o.phone && (
          <>
            <a href={`sms:${digitsOnly(o.phone)}?body=${encodeURIComponent(message(o.code))}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand px-3 text-sm font-semibold text-brand hover:bg-brand/5">
              <MessageSquare className="size-4" /> SMS
            </a>
            <a href={`https://wa.me/${digitsOnly(o.phone)}?text=${encodeURIComponent(message(o.code))}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-green-600 px-3 text-sm font-semibold text-green-700 hover:bg-green-50">
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </>
        )}
        {live && !o.selfIssued && (
          <Button variant="danger" className="!min-h-9 !px-3" loading={busy} onClick={() => run(() => api.adminRevokeOtp(o.uid), 'Code revoked')}>
            <ShieldOff className="size-4" /> Revoke
          </Button>
        )}
      </div>
    </li>
  )
}

export default function AdminOtp() {
  const list = useOtpRequests()
  const [now, setNow] = useState(Date.now())
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const active = (list || []).filter((o) => o.status === 'pending' || (o.status === 'sent' && o.expiresAt > now))
  const history = (list || []).filter((o) => !active.includes(o))

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Security codes" subtitle="Customers waiting for a one-time passcode appear here instantly." />
      <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
        <strong>How it works:</strong> a customer logs in → their request shows up here → tap <em>Generate code</em> → send it by SMS, WhatsApp, or read it to them → they type it in to finish logging in. Codes expire after 10 minutes.
      </div>

      <Card strip title={`Waiting now (${active.length})`}>
        {list === null ? <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
          : active.length === 0 ? <EmptyState icon={KeyRound} title="No one is waiting" text="When a customer logs in, their request appears here right away." />
          : <ul className="space-y-3">{active.map((o) => <OtpRow key={o.uid} o={o} now={now} />)}</ul>}
      </Card>

      {history.length > 0 && (
        <Card strip title="Recent" action={<button onClick={() => setShowAll(!showAll)} className="text-sm font-semibold text-brand">{showAll ? 'Show less' : 'Show all'}</button>}>
          <ul className="space-y-3">{(showAll ? history : history.slice(0, 5)).map((o) => <OtpRow key={o.uid} o={o} now={now} />)}</ul>
        </Card>
      )}
    </div>
  )
}
