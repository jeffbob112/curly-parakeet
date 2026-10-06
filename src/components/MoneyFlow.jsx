// A 3-step flow used by Transfer / Withdraw / Pay bill / Deposit:
//   1. form  ->  2. review & confirm  ->  3. success receipt
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { money } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { Button, ErrorNote } from './ui'

export default function MoneyFlow({ renderForm, review, onSubmit, successTitle, validate, onReset }) {
  const [step, setStep] = useState('form')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const next = (e) => {
    e.preventDefault()
    setError(null)
    try {
      validate?.()
      setStep('review')
    } catch (err) {
      setError(err)
    }
  }

  const confirm = async () => {
    setLoading(true)
    setError(null)
    try {
      await onSubmit()
      setStep('done')
      toast(successTitle)
    } catch (err) {
      setError(err)
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    onReset?.()
    setStep('form')
  }

  if (step === 'done') {
    return (
      <div className="animate-slide-up flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="size-16 text-green-600" />
        <p className="mt-3 text-xl font-semibold">{successTitle}</p>
        <p className="mt-1 text-3xl font-bold text-brand">{money(review.find((r) => r[0] === 'Amount')?.[2] ?? 0)}</p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={reset}>Make another</Button>
          <Link to="/app/activity"><Button className="w-full">View activity</Button></Link>
        </div>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="animate-slide-up">
        <p className="mb-3 text-sm text-slate-500">Please review the details below.</p>
        <dl className="divide-y divide-slate-100 rounded-xl bg-surface px-4 text-sm">
          {review.filter(Boolean).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <ErrorNote error={error} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setStep('form')} disabled={loading}>Back</Button>
          <Button onClick={confirm} loading={loading}>Confirm</Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={next} className="space-y-4">
      {renderForm()}
      <ErrorNote error={error} />
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Link to="/app"><Button type="button" variant="outline" className="w-full">Cancel</Button></Link>
        <Button type="submit">Next</Button>
      </div>
    </form>
  )
}
