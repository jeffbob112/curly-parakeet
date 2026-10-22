import { Clock, MessageSquareText, Send, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, ErrorNote } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { OTP_TTL, RESEND_AFTER, markOtpVerified } from '../services/otp'
import AuthShell from './AuthShell'

const maskPhone = (phone, email) => (phone ? `•••-•••-${phone.replace(/\D/g, '').slice(-4)}` : email.replace(/^(.).+(@.+)$/, '$1•••$2'))
const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`

// Step 2 of login: enter the 6-digit code.
// Customers wait for the bank (Admin → Security codes) to send it; admins get theirs directly.
export default function Verify() {
  const { user, loading, otpVerified, refreshOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [error, setError] = useState(null)
  const [otp, setOtp] = useState(undefined) // live status from the database
  const [selfCode, setSelfCode] = useState(null) // admins only
  const [requestedAt, setRequestedAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [checking, setChecking] = useState(false)
  const inputs = useRef([])
  const requested = useRef(false)

  const request = async () => {
    setError(null)
    setDigits(Array(6).fill(''))
    setRequestedAt(Date.now())
    try {
      const r = await api.requestOtp(user.uid)
      setSelfCode(r.selfCode ? { code: r.selfCode } : null)
    } catch (err) {
      setError(err)
    }
  }

  // Watch our OTP request; ask for a code the first time unless a fresh one is already on its way.
  useEffect(() => {
    if (!user || otpVerified) return
    return api.watchOtp(user.uid, (o) => {
      setOtp(o)
      if (requested.current) return
      requested.current = true
      const fresh = o && ((o.status === 'pending' && Date.now() - o.requestedAt < OTP_TTL) || (o.status === 'sent' && o.expiresAt > Date.now()))
      if (user.role === 'admin' || !fresh) request()
      else setRequestedAt(o.requestedAt)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, otpVerified])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (otpVerified) return <Navigate to={location.state?.from || (user.role === 'admin' ? '/admin' : '/app')} replace />

  const submit = async (code) => {
    setChecking(true)
    setError(null)
    try {
      await api.verifyOtpCode(user.uid, code)
      markOtpVerified(user.uid)
      refreshOtp()
    } catch (err) {
      setError(err)
      setDigits(Array(6).fill(''))
      inputs.current[0]?.focus()
    } finally {
      setChecking(false)
    }
  }

  const fillFrom = (text) => {
    const v = text.replace(/\D/g, '').slice(0, 6).split('')
    const next = Array(6).fill('').map((_, i) => v[i] || '')
    setDigits(next)
    inputs.current[Math.min(v.length, 5)]?.focus()
    if (v.length === 6) submit(v.join(''))
  }

  const setDigit = (i, value) => {
    const v = value.replace(/\D/g, '')
    if (v.length > 1) return fillFrom(v) // autofill / paste
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(Boolean)) submit(next.join(''))
  }

  const cancel = async () => {
    await api.logout()
    navigate('/login')
  }

  const status = otp?.status
  const sentAndValid = status === 'sent' && otp.expiresAt > now
  const resendIn = Math.max(0, Math.ceil((requestedAt + RESEND_AFTER - now) / 1000))
  const target = maskPhone(user.phone, user.email)

  return (
    <>
      {selfCode && (
        <button onClick={() => fillFrom(selfCode.code)} className="animate-slide-up fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-slate-900/95 p-3 text-left text-white shadow-2xl">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-500"><MessageSquareText className="size-5" /></span>
          <span className="text-sm">
            <span className="block text-xs text-white/60">ADMIN SIGN-IN · Parakeet Bank</span>
            <span className="block">Your admin code is <strong className="tracking-widest">{selfCode.code}</strong>. Tap to fill.</span>
            <span className="mt-1 block text-xs text-white/60">Customers don't see this — their codes are sent from Admin → Security codes.</span>
          </span>
        </button>
      )}
      <AuthShell title="Verify it's you">
        <div className="text-center">
          <ShieldCheck className="mx-auto size-12 text-brand" />
          {user.role === 'admin' ? (
            <p className="mt-3 text-sm text-slate-600">Enter the 6-digit admin code to continue.</p>
          ) : sentAndValid ? (
            <p className="mt-3 text-sm text-slate-600">We've sent a 6-digit code to <strong>{target}</strong>. Enter it below to finish logging in.</p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">For your security, our team will send a 6-digit code to <strong>{target}</strong>. Keep this page open.</p>
          )}
        </div>

        {/* Live status of the code */}
        {user.role !== 'admin' && (
          <div className={`mt-4 flex items-center gap-3 rounded-xl p-3 text-sm ${sentAndValid ? 'bg-green-50 text-green-800' : status === 'revoked' || (status === 'sent' && !sentAndValid) ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900'}`} role="status">
            {sentAndValid ? <Send className="size-5 shrink-0" /> : <Clock className="size-5 shrink-0 animate-pulse" />}
            <span>
              {otp === undefined ? 'Checking…'
                : sentAndValid ? <>Code sent. It expires in <strong>{mmss(otp.expiresAt - now)}</strong>.</>
                : status === 'revoked' ? 'That code was cancelled. Please request a new one.'
                : status === 'sent' ? 'Your code has expired. Please request a new one.'
                : 'Waiting for your code… it usually arrives within a few minutes.'}
            </span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); submit(digits.join('')) }} className="mt-5 space-y-5">
          <div className="flex justify-center gap-2" onPaste={(e) => { e.preventDefault(); fillFrom(e.clipboardData.getData('text')) }}>
            {digits.map((d, i) => (
              <input key={i} ref={(el) => (inputs.current[i] = el)} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`} maxLength={6} autoFocus={i === 0}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && inputs.current[i - 1]?.focus()}
                className="h-14 w-11 rounded-xl border border-slate-300 text-center text-2xl font-semibold text-brand outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-12" />
            ))}
          </div>
          <ErrorNote error={error} />
          <Button type="submit" loading={checking} disabled={digits.some((d) => !d)} className="w-full">Verify</Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={cancel} className="text-slate-500 underline">Cancel</button>
            <button type="button" disabled={resendIn > 0} onClick={request}
              className="font-semibold text-brand underline disabled:text-slate-400 disabled:no-underline">
              {resendIn > 0 ? `Request a new code in ${resendIn}s` : 'Request a new code'}
            </button>
          </div>
        </form>
      </AuthShell>
    </>
  )
}
