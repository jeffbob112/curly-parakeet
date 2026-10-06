import { ArrowLeftRight, Receipt, UserCheck, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MoneyFlow from '../components/MoneyFlow'
import PageHeader from '../components/PageHeader'
import { AmountInput, Card, Field, Input, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { DEBIT_CATEGORIES } from '../lib/constants'
import { maskAccount, money } from '../lib/format'
import { BankError, parseAmount } from '../lib/ledger'
import api from '../services/api'

const tabs = [
  { id: 'transfer', label: 'Transfer', sub: 'to another account', icon: ArrowLeftRight },
  { id: 'withdraw', label: 'Withdraw', sub: 'cash out', icon: Wallet },
  { id: 'bill', label: 'Pay bills', sub: 'pay now', icon: Receipt },
]

export default function Transfer() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'transfer'

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pay & Transfer" subtitle="Move money in a few taps." />
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
        {tabs.map(({ id, label, sub, icon: Icon }) => (
          <button key={id} onClick={() => setParams(id === 'transfer' ? {} : { tab: id })}
            className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition ${tab === id ? 'bg-brand text-white' : 'text-brand hover:bg-brand/5'}`}>
            <Icon className="size-6" />
            <span className="text-sm font-semibold">{label}</span>
            <span className={`hidden text-xs sm:block ${tab === id ? 'text-white/70' : 'text-slate-500'}`}>{sub}</span>
          </button>
        ))}
      </div>
      <Card strip>
        {/* key= resets the form state when switching tabs */}
        {tab === 'transfer' && <TransferForm key="t" />}
        {tab === 'withdraw' && <WithdrawForm key="w" kind="withdraw" />}
        {tab === 'bill' && <WithdrawForm key="b" kind="bill" />}
      </Card>
    </div>
  )
}

function FromAccount() {
  const { user } = useAuth()
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface p-3 text-sm">
      <span>
        <span className="block text-slate-500">From</span>
        <span className="font-semibold">Checking {maskAccount(user.accountNumber)}</span>
      </span>
      <span className="text-right">
        <span className="block text-slate-500">Available</span>
        <span className="font-semibold">{money(user.balance)}</span>
      </span>
    </div>
  )
}

function TransferForm() {
  const { user } = useAuth()
  const [toAccount, setToAccount] = useState('')
  const [recipient, setRecipient] = useState(null)
  const [lookupMsg, setLookupMsg] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  const lookup = async () => {
    setRecipient(null)
    setLookupMsg('')
    if (toAccount.trim().length < 6) return
    const r = await api.lookupAccount(toAccount)
    if (!r) setLookupMsg('No account found with that number.')
    else if (r.uid === user.uid) setLookupMsg("That's your own account.")
    else setRecipient(r)
  }

  return (
    <MoneyFlow
      successTitle="Transfer sent"
      validate={() => {
        if (!recipient) throw new BankError('Enter a valid recipient account number.')
        if (parseAmount(amount) > user.balance) throw new BankError('Insufficient funds.')
      }}
      review={[
        ['To', `${recipient?.fullName} (${maskAccount(recipient?.accountNumber)})`],
        ['Amount', money(amount), Number(amount)],
        memo && ['Memo', memo],
        ['Balance after', money(user.balance - Number(amount))],
      ]}
      onSubmit={() => api.transfer(user.uid, { toAccount, amount, description: memo })}
      onReset={() => { setAmount(''); setMemo(''); setToAccount(''); setRecipient(null) }}
      renderForm={() => (
        <>
          <FromAccount />
          <Field label="Recipient account number" error={lookupMsg} hint="Ask the recipient for their 10-digit account number (shown on their Profile page).">
            <Input inputMode="numeric" value={toAccount} required
              onChange={(e) => { setToAccount(e.target.value.replace(/\D/g, '')); setRecipient(null); setLookupMsg('') }}
              onBlur={lookup} placeholder="e.g. 4821930576" maxLength={10} />
          </Field>
          {recipient && (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              <UserCheck className="size-4" /> Sending to <strong>{recipient.fullName}</strong>
            </p>
          )}
          <Field label="Amount"><AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <Field label="Memo (optional)"><Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={60} placeholder="Dinner, rent…" /></Field>
        </>
      )}
    />
  )
}

function WithdrawForm({ kind }) {
  const { user } = useAuth()
  const isBill = kind === 'bill'
  const [amount, setAmount] = useState('')
  const [payee, setPayee] = useState('')
  const [category, setCategory] = useState(isBill ? 'Utilities' : 'Other')

  return (
    <MoneyFlow
      successTitle={isBill ? 'Bill paid' : 'Withdrawal complete'}
      validate={() => {
        if (parseAmount(amount) > user.balance) throw new BankError('Insufficient funds.')
        if (isBill && !payee.trim()) throw new BankError('Enter who you are paying.')
      }}
      review={[
        isBill ? ['Pay to', payee] : ['Type', 'Cash withdrawal'],
        ['Category', category],
        ['Amount', money(amount), Number(amount)],
        ['Balance after', money(user.balance - Number(amount))],
      ]}
      onSubmit={() => isBill
        ? api.payBill(user.uid, { amount, description: payee, category })
        : api.withdraw(user.uid, { amount, description: payee || 'ATM withdrawal', category })}
      onReset={() => { setAmount(''); setPayee('') }}
      renderForm={() => (
        <>
          <FromAccount />
          <Field label={isBill ? 'Payee' : 'Description (optional)'}>
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder={isBill ? 'Energy Co.' : 'ATM withdrawal'} required={isBill} maxLength={60} />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {DEBIT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Amount"><AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          {!isBill && (
            <div className="flex flex-wrap gap-2">
              {[20, 60, 100, 200].map((v) => (
                <button type="button" key={v} onClick={() => setAmount(String(v))}
                  className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium hover:border-brand hover:text-brand">${v}</button>
              ))}
            </div>
          )}
        </>
      )}
    />
  )
}
