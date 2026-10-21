// One page, six forms: /app/transfer/:mode  (between | send | bill | wire | card | withdraw)
import { ArrowLeft, Check, Copy, UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import AccountSelect from '../components/AccountSelect'
import MoneyFlow from '../components/MoneyFlow'
import { AmountInput, Card, Field, Input, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { ACCOUNT_TYPES, accountList, available, isLiability, minimumPayment } from '../lib/accounts'
import { PAYEES, WIRE_FEES } from '../lib/constants'
import { money } from '../lib/format'
import { useData } from '../lib/hooks'
import { BankError, parseAmount } from '../lib/ledger'
import api from '../services/api'
import { TRANSFER_OPTIONS } from './PayTransfer'

const label = (acc) => `${ACCOUNT_TYPES[acc.id].label} ••${String(acc.number).slice(-4)}`

export default function TransferForm() {
  const { mode } = useParams()
  const option = TRANSFER_OPTIONS.find((o) => o.id === mode)
  if (!option) return <Navigate to="/app/transfer" replace />
  const Form = { between: Between, send: SendMoney, bill: PayBill, wire: Wire, card: PayCard, withdraw: Withdraw }[mode]
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Link to="/app/transfer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft className="size-4" /> Pay & Transfer</Link>
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand"><option.icon className="size-5" /></span>
        <div><h1 className="text-2xl font-bold">{option.title}</h1><p className="text-sm text-slate-500">{option.sub}</p></div>
      </div>
      <Card strip><Form key={mode} /></Card>
    </div>
  )
}

// Funds check for the "from" account (assets: balance; card/HELOC: available credit)
function checkFunds(acc, amount) {
  if (amount > available(acc)) throw new BankError(isLiability(acc) ? 'That is more than your available credit.' : 'Insufficient funds.')
}

function Between() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const accounts = accountList(user)
  const [from, setFrom] = useState(params.get('from') || 'chk')
  const [to, setTo] = useState(params.get('to') || accounts.find((a) => a.id !== (params.get('from') || 'chk'))?.id || 'sav')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const fromAcc = user.accounts[from]
  const toAcc = user.accounts[to]
  return (
    <MoneyFlow cancelTo="/app/transfer" successTitle="Transfer complete"
      validate={() => { if (from === to) throw new BankError('Choose two different accounts.'); checkFunds(fromAcc, parseAmount(amount)) }}
      review={[['From', fromAcc && label(fromAcc)], ['To', toAcc && label(toAcc)], ['Amount', money(amount), Number(amount)], memo && ['Memo', memo], ['When', 'Today']]}
      onSubmit={() => api.transferInternal(user.uid, { from, to, amount, memo })}
      onReset={() => { setAmount(''); setMemo('') }}
      renderForm={() => (
        <>
          <Field label="From"><AccountSelect accounts={accounts} value={from} onChange={setFrom} /></Field>
          <Field label="To"><AccountSelect accounts={accounts} value={to} onChange={setTo} exclude={from} /></Field>
          {from === 'heloc' && <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">Drawing from your home equity line borrows money at {ACCOUNT_TYPES.heloc.apr}% APR.</p>}
          <Field label="Amount"><AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <Field label="Memo (optional)"><Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={60} /></Field>
        </>
      )} />
  )
}

function SendMoney() {
  const { user } = useAuth()
  const accounts = accountList(user).filter((a) => a.id === 'chk' || a.id === 'sav')
  const [tab, setTab] = useState('send')
  const [from, setFrom] = useState('chk')
  const [toAccount, setToAccount] = useState('')
  const [recipient, setRecipient] = useState(null)
  const [lookupMsg, setLookupMsg] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [copied, setCopied] = useState(false)
  const { data: txs } = useData(() => api.listTransactions(user.uid), [user.uid])

  // Recent people you've sent to (that have a Parakeet account number)
  const recents = useMemo(() => {
    const seen = new Map()
    for (const t of txs || []) if (t.method === 'send' && t.counterpartyAccount && !seen.has(t.counterpartyAccount)) seen.set(t.counterpartyAccount, t.counterparty)
    return [...seen].slice(0, 6)
  }, [txs])

  const lookup = async (num = toAccount) => {
    setRecipient(null)
    setLookupMsg('')
    if (num.trim().length < 6) return
    const r = await api.lookupAccount(num)
    if (!r) setLookupMsg('No Parakeet account found with that number.')
    else if (r.uid === user.uid) setLookupMsg('That is your own account. Use "Transfer" instead.')
    else setRecipient(r)
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 rounded-full bg-slate-100 p-1">
        {['send', 'receive'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full py-2 text-sm font-semibold capitalize ${tab === t ? 'bg-white text-brand shadow' : 'text-slate-500'}`}>{t}</button>
        ))}
      </div>
      {tab === 'receive' ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-600">Share your account number to get paid by another Parakeet customer.</p>
          <div className="rounded-xl bg-surface p-4">
            <p className="text-xs text-slate-500">{ACCOUNT_TYPES.chk.label}</p>
            <p className="font-mono text-2xl font-bold tracking-wider">{user.accounts.chk?.number}</p>
            <p className="text-sm">{user.fullName}</p>
          </div>
          <button onClick={async () => { await navigator.clipboard?.writeText(user.accounts.chk?.number); setCopied(true) }} className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy account number'}
          </button>
        </div>
      ) : (
        <MoneyFlow cancelTo="/app/transfer" successTitle="Money sent"
          validate={() => { if (!recipient) throw new BankError('Enter a valid recipient account number.'); checkFunds(user.accounts[from], parseAmount(amount)) }}
          review={[['To', `${recipient?.fullName} (••${String(recipient?.accountNumber).slice(-4)})`], ['From', label(user.accounts[from])], ['Amount', money(amount), Number(amount)], memo && ['Memo', memo], ['Arrives', 'Instantly']]}
          onSubmit={() => api.sendMoney(user.uid, { toAccount, from, amount, memo, recipientName: recipient?.fullName })}
          onReset={() => { setAmount(''); setMemo(''); setToAccount(''); setRecipient(null) }}
          renderForm={() => (
            <>
              {recents.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Recent</p>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto">
                    {recents.map(([num, name]) => (
                      <button type="button" key={num} onClick={() => { setToAccount(num); lookup(num) }} className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs">
                        <span className="flex size-12 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                        <span className="w-full truncate text-center">{name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Recipient's account number" error={lookupMsg} hint="Their 10-digit number is on their Pay & Transfer → Send money → Receive screen.">
                <Input inputMode="numeric" value={toAccount} required maxLength={10} placeholder="e.g. 4821930576"
                  onChange={(e) => { setToAccount(e.target.value.replace(/\D/g, '')); setRecipient(null); setLookupMsg('') }} onBlur={() => lookup()} />
              </Field>
              {recipient && <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"><UserCheck className="size-4" /> Sending to <strong>{recipient.fullName}</strong></p>}
              <Field label="From"><AccountSelect accounts={accounts} value={from} onChange={setFrom} /></Field>
              <Field label="Amount"><AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
              <Field label="What's it for? (optional)"><Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={60} placeholder="Dinner, rent…" /></Field>
            </>
          )} />
      )}
    </div>
  )
}

function PayBill() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const accounts = accountList(user).filter((a) => a.id === 'chk' || a.id === 'sav')
  const [payee, setPayee] = useState(params.get('payee') || PAYEES[0].name)
  const [custom, setCustom] = useState('')
  const [from, setFrom] = useState('chk')
  const [amount, setAmount] = useState('')
  const name = payee === '__new' ? custom.trim() : payee
  const category = PAYEES.find((p) => p.name === payee)?.category || 'Other'
  return (
    <MoneyFlow cancelTo="/app/transfer" successTitle="Bill paid"
      validate={() => { if (!name) throw new BankError('Enter who you are paying.'); checkFunds(user.accounts[from], parseAmount(amount)) }}
      review={[['Pay to', name], ['From', label(user.accounts[from])], ['Category', category], ['Amount', money(amount), Number(amount)], ['Deliver by', 'Today']]}
      onSubmit={() => api.payBill(user.uid, { accountId: from, payee: name, amount, category })}
      onReset={() => setAmount('')}
      renderForm={() => (
        <>
          <Field label="Payee">
            <Select value={payee} onChange={(e) => setPayee(e.target.value)}>
              {PAYEES.map((p) => <option key={p.name} value={p.name}>{p.name} ({p.account})</option>)}
              <option value="__new">+ Someone else…</option>
            </Select>
          </Field>
          {payee === '__new' && <Field label="Payee name"><Input value={custom} onChange={(e) => setCustom(e.target.value)} required maxLength={50} /></Field>}
          <Field label="Pay from"><AccountSelect accounts={accounts} value={from} onChange={setFrom} /></Field>
          <Field label="Amount"><AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        </>
      )} />
  )
}

function PayCard() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const loans = accountList(user).filter(isLiability)
  const sources = accountList(user).filter((a) => a.id === 'chk' || a.id === 'sav')
  const [to, setTo] = useState(params.get('to') || loans[0]?.id)
  const [from, setFrom] = useState('chk')
  const [choice, setChoice] = useState('min')
  const [other, setOther] = useState('')
  if (!loans.length) return <p className="py-6 text-center text-sm text-slate-500">You don't have a credit card or loan yet. <Link to="/app/products" className="font-semibold text-brand underline">See products</Link></p>
  const acc = user.accounts[to]
  const amount = choice === 'min' ? minimumPayment(acc) : choice === 'full' ? acc.balance : Number(other)
  return (
    <MoneyFlow cancelTo="/app/transfer" successTitle="Payment sent"
      validate={() => { parseAmount(amount); if (amount > acc.balance + 0.001) throw new BankError("That's more than you owe."); checkFunds(user.accounts[from], amount) }}
      review={[['Pay', label(acc)], ['From', label(user.accounts[from])], ['Amount', money(amount), amount], ['Balance after', money(acc.balance - amount)]]}
      onSubmit={() => api.transferInternal(user.uid, { from, to, amount })}
      onReset={() => setOther('')}
      renderForm={() => (
        <>
          <Field label="Pay to">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {loans.map((l) => <option key={l.id} value={l.id}>{label(l)} — owe {money(l.balance)}</option>)}
            </Select>
          </Field>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Amount</legend>
            {[['min', 'Minimum payment', minimumPayment(acc)], ['full', 'Current balance', acc.balance], ['other', 'Other amount', null]].map(([v, text, amt]) => (
              <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${choice === v ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                <input type="radio" name="amt" checked={choice === v} onChange={() => setChoice(v)} className="accent-brand" />
                <span className="flex-1 text-sm font-medium">{text}</span>
                {amt != null && <span className="font-semibold tabular-nums">{money(amt)}</span>}
              </label>
            ))}
            {choice === 'other' && <AmountInput value={other} onChange={(e) => setOther(e.target.value)} required />}
          </fieldset>
          <Field label="Pay from"><AccountSelect accounts={sources} value={from} onChange={setFrom} /></Field>
        </>
      )} />
  )
}

function Wire() {
  const { user } = useAuth()
  const accounts = accountList(user).filter((a) => a.id === 'chk' || a.id === 'sav')
  const [intl, setIntl] = useState(false)
  const [f, setF] = useState({ recipientName: '', bankName: '', routing: '', accountNumber: '', swift: '', country: '', amount: '', from: 'chk' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const fee = intl ? WIRE_FEES.international : WIRE_FEES.domestic
  return (
    <MoneyFlow cancelTo="/app/transfer" successTitle="Wire sent"
      validate={() => { checkFunds(user.accounts[f.from], parseAmount(f.amount) + fee); if (!intl && f.routing.replace(/\D/g, '').length !== 9) throw new BankError('Routing numbers are 9 digits.') }}
      review={[['To', f.recipientName], ['Bank', f.bankName], intl ? ['SWIFT / Country', `${f.swift} · ${f.country}`] : ['Routing', f.routing], ['Account', `••${f.accountNumber.slice(-4)}`], ['Amount', money(f.amount), Number(f.amount)], ['Wire fee', money(fee)], ['Total', money(Number(f.amount) + fee)]]}
      onSubmit={() => api.wire(user.uid, { ...f, international: intl })}
      onReset={() => setF({ ...f, amount: '' })}
      renderForm={() => (
        <>
          <div className="grid grid-cols-2 rounded-full bg-slate-100 p-1">
            {[[false, 'U.S. (domestic)'], [true, 'International']].map(([v, t]) => (
              <button type="button" key={t} onClick={() => setIntl(v)} className={`rounded-full py-2 text-sm font-semibold ${intl === v ? 'bg-white text-brand shadow' : 'text-slate-500'}`}>{t}</button>
            ))}
          </div>
          <Field label="Recipient's full name"><Input value={f.recipientName} onChange={set('recipientName')} required /></Field>
          <Field label="Recipient's bank"><Input value={f.bankName} onChange={set('bankName')} required /></Field>
          {intl ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="SWIFT / BIC"><Input value={f.swift} onChange={set('swift')} required maxLength={11} placeholder="ABCDGB2L" /></Field>
              <Field label="Country"><Input value={f.country} onChange={set('country')} required /></Field>
            </div>
          ) : (
            <Field label="Routing number (9 digits)"><Input inputMode="numeric" value={f.routing} onChange={set('routing')} required maxLength={9} /></Field>
          )}
          <Field label={intl ? 'IBAN / account number' : 'Account number'}><Input value={f.accountNumber} onChange={set('accountNumber')} required /></Field>
          <Field label="Send from"><AccountSelect accounts={accounts} value={f.from} onChange={(v) => setF({ ...f, from: v })} /></Field>
          <Field label="Amount" hint={`A ${money(fee)} ${intl ? 'international' : 'domestic'} wire fee applies.`}><AmountInput value={f.amount} onChange={set('amount')} required /></Field>
        </>
      )} />
  )
}

function Withdraw() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const accounts = accountList(user).filter((a) => a.id === 'chk' || a.id === 'sav')
  const [from, setFrom] = useState(params.get('from') || 'chk')
  const [amount, setAmount] = useState('')
  return (
    <MoneyFlow cancelTo="/app/transfer" successTitle="Withdrawal complete"
      validate={() => checkFunds(user.accounts[from], parseAmount(amount))}
      review={[['From', label(user.accounts[from])], ['Amount', money(amount), Number(amount)], ['Balance after', money(user.accounts[from].balance - Number(amount))]]}
      onSubmit={() => api.withdraw(user.uid, { accountId: from, amount })}
      onReset={() => setAmount('')}
      renderForm={() => (
        <>
          <Field label="From"><AccountSelect accounts={accounts} value={from} onChange={setFrom} /></Field>
          <Field label="Amount"><AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <div className="flex flex-wrap gap-2">
            {[20, 60, 100, 200, 500].map((v) => (
              <button type="button" key={v} onClick={() => setAmount(String(v))} className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium hover:border-brand hover:text-brand">${v}</button>
            ))}
          </div>
        </>
      )} />
  )
}
