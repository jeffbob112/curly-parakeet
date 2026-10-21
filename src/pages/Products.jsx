import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Button, Modal } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ACCOUNT_ORDER, ACCOUNT_TYPES, PRODUCTS } from '../lib/accounts'
import api from '../services/api'

const VISUAL = {
  chk: 'from-brand to-brand-light', sav: 'from-emerald-600 to-emerald-800', cc: 'from-accent to-rose-900',
  heloc: 'from-amber-500 to-amber-700', inv: 'from-violet-600 to-indigo-800',
}

export default function Products() {
  const { user } = useAuth()
  const toast = useToast()
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const open = async () => {
    setBusy(true)
    try {
      await api.openAccount(user.uid, confirm)
      toast(`Your ${ACCOUNT_TYPES[confirm].label} is open!`)
      setConfirm(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Products" subtitle="Open a new account in seconds." />
      <div className="grid gap-3 sm:grid-cols-2">
        {ACCOUNT_ORDER.map((id) => {
          const t = ACCOUNT_TYPES[id]
          const has = user.accounts?.[id] && user.accounts[id].status !== 'closed'
          return (
            <div key={id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
              <div className={`bg-gradient-to-br ${VISUAL[id]} p-5 text-white`}>
                <p className="text-xs uppercase tracking-widest text-white/70">{t.group}</p>
                <p className="mt-1 text-lg font-semibold">{t.label}</p>
                {PRODUCTS[id].defaults.creditLimit && <p className="text-sm text-white/80">Credit line up to ${PRODUCTS[id].defaults.creditLimit.toLocaleString()}</p>}
              </div>
              <div className="flex items-center gap-3 p-4">
                <p className="flex-1 text-sm text-slate-600">{PRODUCTS[id].blurb}</p>
                {has ? (
                  <Link to={id === 'inv' ? '/app/invest' : `/app/accounts/${id}`} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="size-4" /> Open <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <Button className="shrink-0" onClick={() => setConfirm(id)}>Apply</Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Open account">
        {confirm && (
          <div className="space-y-4">
            <p>Open a <strong>{ACCOUNT_TYPES[confirm].label}</strong>?</p>
            <p className="text-sm text-slate-600">{PRODUCTS[confirm].blurb}</p>
            {ACCOUNT_TYPES[confirm].kind === 'liability' && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">You're pre-approved for ${PRODUCTS[confirm].defaults.creditLimit.toLocaleString()}. (Demo: instant approval.)</p>}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setConfirm(null)}>Not now</Button>
              <Button loading={busy} onClick={open}>Open account</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
