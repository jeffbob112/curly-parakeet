import { Camera } from 'lucide-react'
import { useState } from 'react'
import MoneyFlow from '../components/MoneyFlow'
import PageHeader from '../components/PageHeader'
import { AmountInput, Card, Field, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { MAX_SINGLE_TRANSACTION } from '../lib/constants'
import { maskAccount, money } from '../lib/format'
import api from '../services/api'

// Check photo picker. The picture is only previewed (not uploaded) — it's a UI demo.
function CheckSide({ label, image, onChange }) {
  return (
    <label className="relative flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-amber-50 to-orange-100 text-sm font-medium text-amber-900 hover:border-brand">
      {image
        ? <img src={image} alt={label} className="absolute inset-0 size-full object-cover" />
        : <><Camera className="size-6" /> {label}</>}
      <input type="file" accept="image/*" capture="environment" className="sr-only"
        onChange={(e) => e.target.files[0] && onChange(URL.createObjectURL(e.target.files[0]))} />
    </label>
  )
}

export default function Deposit() {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [front, setFront] = useState(null)
  const [back, setBack] = useState(null)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Deposit" subtitle="Add money to your checking account." />
      <Card strip>
        <MoneyFlow
          successTitle="Deposit received"
          review={[
            ['Deposit to', `Checking ${maskAccount(user.accountNumber)}`],
            ['Amount', money(amount), Number(amount)],
            memo && ['Memo', memo],
            ['Balance after', money(user.balance + Number(amount))],
          ]}
          onSubmit={() => api.deposit(user.uid, { amount, description: memo || 'Mobile check deposit' })}
          onReset={() => { setAmount(''); setMemo(''); setFront(null); setBack(null) }}
          renderForm={() => (
            <>
              <p className="text-sm text-slate-600">
                Sign and write <em>“for deposit only at Parakeet Bank”</em> on the back of your check. Photos are optional in this demo.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <CheckSide label="Front of check" image={front} onChange={setFront} />
                <CheckSide label="Back of check" image={back} onChange={setBack} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface p-3 text-sm">
                <span><span className="block text-slate-500">Deposit to</span><span className="font-semibold">Checking {maskAccount(user.accountNumber)}</span></span>
                <span className="text-right"><span className="block text-slate-500">Available balance</span><span className="font-semibold">{money(user.balance)}</span></span>
              </div>
              <Field label="Enter amount" hint={`Limit per deposit: ${money(MAX_SINGLE_TRANSACTION)}`}>
                <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Memo (optional)"><Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={60} placeholder="Birthday check" /></Field>
            </>
          )}
        />
      </Card>
    </div>
  )
}
