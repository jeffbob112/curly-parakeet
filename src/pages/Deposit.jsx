// Mobile check deposit, modelled on the screenshot:
//   check images (front & back) → deposit to → amount → monthly limit → CANCEL / NEXT
//   → review → processing → receipt (with the check images).
import { Camera, CheckCircle2, ImagePlus, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import MoneyFlow from '../components/MoneyFlow'
import { Card, ErrorNote, Field, Input, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { ACCOUNT_TYPES, accountList } from '../lib/accounts'
import { compressImage, sampleCheckBack, sampleCheckFront } from '../lib/checkImages'
import { MONTHLY_CHECK_LIMIT } from '../lib/constants'
import { money } from '../lib/format'
import { useData } from '../lib/hooks'
import { BankError, parseAmount } from '../lib/ledger'
import { checkDepositUsed } from '../lib/operations'
import api from '../services/api'
import { SearchBar } from './Dashboard'

function CheckTile({ side, image, onImage, onSample, setError }) {
  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      onImage(await compressImage(file))
    } catch (err) {
      setError(err)
    }
  }
  return (
    <div className="space-y-2">
      <label className="group relative flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg bg-gradient-to-br from-[#6b4a2f] to-[#3d2817] text-sm font-medium text-white/90 shadow-inner">
        {image ? (
          <>
            <img src={image} alt={`${side} of check`} className="absolute inset-[6%] h-[88%] w-[88%] object-contain drop-shadow-lg" />
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px]"><RotateCcw className="size-3" /> Retake</span>
          </>
        ) : (
          <>
            <span className="flex size-11 items-center justify-center rounded-full bg-white/15"><Camera className="size-6" /></span>
            <span className="capitalize">{side} of check</span>
            <span className="text-[11px] text-white/60">Tap to take or upload a photo</span>
          </>
        )}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pickFile} aria-label={`Upload ${side} of check`} />
      </label>
      {!image && (
        <button type="button" onClick={onSample} className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-brand">
          <Sparkles className="size-3.5" /> Use sample {side}
        </button>
      )}
    </div>
  )
}

const STEPS = ['Uploading check images', 'Reading check details', 'Verifying amount & endorsement', 'Depositing funds']

function Processing() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 650)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="py-6">
      <p className="mb-5 text-center text-lg font-semibold">Processing your deposit…</p>
      <ul className="mx-auto max-w-xs space-y-3">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-sm ${i > step ? 'text-slate-400' : 'text-slate-800'}`}>
            {i < step ? <CheckCircle2 className="size-5 text-green-600" /> : i === step ? <Loader2 className="size-5 animate-spin text-brand" /> : <span className="size-5 rounded-full border-2 border-slate-200" />}
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Deposit() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const accounts = accountList(user).filter((a) => a.id === 'chk' || a.id === 'sav')
  const [accountId, setAccountId] = useState(params.get('to') || 'chk')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [front, setFront] = useState(null)
  const [back, setBack] = useState(null)
  const [error, setError] = useState(null)
  const { data: txs } = useData(() => api.listTransactions(user.uid), [user.uid])
  const used = useMemo(() => checkDepositUsed(txs || [], accountId), [txs, accountId])
  const remaining = Math.max(0, MONTHLY_CHECK_LIMIT - used)
  const acc = user.accounts[accountId]

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <SearchBar />
      <Card>
        <MoneyFlow cancelTo="/app" successTitle="Deposit received"
          processing={<Processing />}
          validate={() => {
            if (!front || !back) throw new BankError('Add images of the front and back of your check.')
            const v = parseAmount(amount)
            if (v > remaining) throw new BankError(`That's over your monthly limit. You have ${money(remaining)} remaining.`)
          }}
          review={[
            ['Deposit to', `${ACCOUNT_TYPES[accountId].label} ••${String(acc?.number).slice(-4)}`],
            ['Amount', money(amount), Number(amount), (
              <div key="imgs" className="mt-4 grid w-full grid-cols-2 gap-2">
                {[front, back].map((src, i) => src && <img key={i} src={src} alt={i ? 'Check back' : 'Check front'} className="aspect-[16/8] w-full rounded-lg bg-slate-100 object-contain ring-1 ring-slate-200" />)}
              </div>
            )],
            memo && ['Memo', memo],
            ['Funds available', 'Today (demo)'],
            ['Balance after', money((acc?.balance || 0) + Number(amount))],
          ]}
          onSubmit={async () => {
            await Promise.all([
              api.deposit(user.uid, { accountId, amount, description: memo || 'Mobile check deposit', checkImages: { front, back } }),
              new Promise((r) => setTimeout(r, 2800)), // let the processing animation play
            ])
          }}
          onReset={() => { setAmount(''); setMemo(''); setFront(null); setBack(null) }}
          renderForm={() => (
            <>
              <p className="text-sm text-slate-800">
                Sign and write <strong>“for deposit only at Parakeet Bank”</strong> on the back of your check.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <CheckTile side="front" image={front} onImage={setFront} setError={setError}
                  onSample={() => setFront(sampleCheckFront({ payee: user.fullName, amount: amount || 100 }))} />
                <CheckTile side="back" image={back} onImage={setBack} setError={setError}
                  onSample={() => setBack(sampleCheckBack({ payee: user.fullName }))} />
              </div>
              {!front && !back && (
                <button type="button" onClick={() => { setFront(sampleCheckFront({ payee: user.fullName, amount: amount || 100 })); setBack(sampleCheckBack({ payee: user.fullName })); if (!amount) setAmount('100') }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-brand hover:text-brand">
                  <ImagePlus className="size-4" /> No check handy? Use a sample check
                </button>
              )}
              <ErrorNote error={error} />

              <div className="divide-y divide-slate-200 border-y border-slate-200">
                <label className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block font-medium">Deposit to</span>
                    <span className="text-xs text-slate-500">Available balance</span>
                  </span>
                  <span className="text-right">
                    <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Deposit to">
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.id === 'chk' ? 'My Checking' : 'My Savings'} ••{String(a.number).slice(-4)}</option>)}
                    </Select>
                    <span className="mt-0.5 block text-xs text-slate-500">{money(acc?.balance)}</span>
                  </span>
                </label>
                <label className="flex items-center justify-between gap-3 py-3">
                  <span className="font-medium">Enter amount</span>
                  <span className="flex items-center text-xl font-semibold text-brand-light">
                    $<input type="number" inputMode="decimal" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required
                      style={{ width: `${Math.max(3, String(amount).length) + 0.5}ch` }}
                      className="bg-transparent text-right outline-none placeholder:text-brand-light/50" aria-label="Amount" />
                  </span>
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Monthly deposit limit for this account: {money(MONTHLY_CHECK_LIMIT)}. You have {money(remaining)} remaining.
              </p>
              <Field label="Memo (optional)"><Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={60} placeholder="Birthday check" /></Field>
            </>
          )}
        />
      </Card>
      <p className="px-2 text-center text-xs text-slate-500">
        Deposits made before 9 p.m. ET are usually available the next business day. <Link to="/app/activity?q=check" className="text-brand underline">View past check deposits</Link>
      </p>
    </div>
  )
}
