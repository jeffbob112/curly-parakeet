import { MessageSquareText, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, ErrorNote } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { RESEND_AFTER, getChallenge, sendOtp, verifyOtp } from '../services/otp'
import AuthShell from './AuthShell'

const maskPhone = (phone, email) => (phone ? `•••-•••-${phone.replace(/\D/g, '').slice(-4)}` : email.replace(/^(.).+(@.+)$/, '$1•••$2'))

// Step 2 of login: enter the 6-digit code we "texted" you.
export default function Verify() {
  const { user, loading, otpVerified, refreshOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [error, setError] = useState(null)
  const [sms, setSms] = useState(null) // the simulated text message banner
  const [now, setNow] = useState(Date.now())
  const [checking, setChecking] = useState(false)
  const inputs = useRef([])

  // Send a code when the page opens (unless a fresh one already exists).
  useEffect(() => {
    if (!user || otpVerified) return
    const c = getChallenge()
    if (c && c.uid === user.uid && c.expiresAt > Date.now()) setSms(c)
    else setSms(sendOtp(user))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

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
    await new Promise((r) => setTimeout(r, 400))
    try {
      verifyOtp(user.uid, code)
      refreshOtp()
    } catch (err) {
      setError(err)
      setDigits(Array(6).fill(''))
      inputs.current[0]?.focus()
    } finally {
      setChecking(false)
    }
  }

  const setDigit = (i, value) => {
    const v = value.replace(/\D/g, '')
    if (v.length > 1) return paste(v) // autofill / paste
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(Boolean)) submit(next.join(''))
  }

  const paste = (text) => {
    const v = text.replace(/\D/g, '').slice(0, 6).split('')
    const next = Array(6).fill('').map((_, i) => v[i] || '')
    setDigits(next)
    inputs.current[Math.min(v.length, 5)]?.focus()
    if (v.length === 6) submit(v.join(''))
  }

  const resendIn = sms ? Math.max(0, Math.ceil((sms.sentAt + RESEND_AFTER - now) / 1000)) : 0
  const expiresIn = sms ? Math.max(0, Math.ceil((sms.expiresAt - now) / 1000)) : 0
  const cancel = async () => {
    await api.logout()
    navigate('/login')
  }

  return (
    <>
      {/* Simulated SMS notification */}
      {sms && (
        <button onClick={() => paste(sms.code)} className="animate-slide-up fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-slate-900/95 p-3 text-left text-white shadow-2xl">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-500"><MessageSquareText className="size-5" /></span>
          <span className="text-sm">
            <span className="flex justify-between text-xs text-white/60"><span>MESSAGES · Parakeet Bank</span><span>now</span></span>
            <span className="block">Your verification code is <strong className="tracking-widest">{sms.code}</strong>. It expires in 5 minutes. Don't share it with anyone.</span>
            <span className="mt-1 block text-xs text-white/60">Demo: tap to fill the code</span>
          </span>
        </button>
      )}
      <AuthShell title="Verify it's you">
        <div className="text-center">
          <ShieldCheck className="mx-auto size-12 text-brand" />
          <p className="mt-3 text-sm text-slate-600">
            We sent a 6-digit code to <strong>{maskPhone(user.phone, user.email)}</strong>. Enter it below to finish logging in.
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit(digits.join('')) }} className="mt-6 space-y-5">
          <div className="flex justify-center gap-2" onPaste={(e) => { e.preventDefault(); paste(e.clipboardData.getData('text')) }}>
            {digits.map((d, i) => (
              <input key={i} ref={(el) => (inputs.current[i] = el)} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`} maxLength={6} autoFocus={i === 0}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && inputs.current[i - 1]?.focus()}
                className="h-14 w-11 rounded-xl border border-slate-300 text-center text-2xl font-semibold text-brand outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-12" />
            ))}
          </div>
          <p className="text-center text-xs text-slate-500">
            {expiresIn > 0 ? `Code expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}` : 'Code expired'}
          </p>
          <ErrorNote error={error} />
          <Button type="submit" loading={checking} disabled={digits.some((d) => !d)} className="w-full">Verify</Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={cancel} className="text-slate-500 underline">Cancel</button>
            <button type="button" disabled={resendIn > 0} onClick={() => { setSms(sendOtp(user)); setError(null); setDigits(Array(6).fill('')) }}
              className="font-semibold text-brand underline disabled:text-slate-400 disabled:no-underline">
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      </AuthShell>
    </>
  )
}
