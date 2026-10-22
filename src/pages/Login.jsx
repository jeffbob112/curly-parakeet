import { Eye, EyeOff, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, ErrorNote, Field, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import api, { firebaseConfigured } from '../services/api'
import AuthShell from './AuthShell'

const SAVED_KEY = 'parakeet_saved_email'

export default function Login() {
  const { user, otpVerified } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => localStorage.getItem(SAVED_KEY) || '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(SAVED_KEY)))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const from = location.state?.from

  if (user && otpVerified) return <Navigate to={from || (user.role === 'admin' ? '/admin' : '/app')} replace />
  if (user && !loading) return <Navigate to="/verify" replace state={{ from }} />

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.login(email.trim(), password)
      if (remember) localStorage.setItem(SAVED_KEY, email.trim())
      else localStorage.removeItem(SAVED_KEY)
      // Step 2: one-time passcode
      navigate('/verify', { replace: true, state: { from } })
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }

  const fill = (e, p) => { setEmail(e); setPassword(p) }

  return (
    <AuthShell
      title="Log in to Online Banking"
      footer={!firebaseConfigured && (
        <div className="mt-6 rounded-xl bg-surface p-4 text-sm">
          <p className="mb-2 font-semibold text-slate-700">Demo accounts (tap to fill)</p>
          <p className="mb-2 text-xs text-slate-500">Customers get their login code from the admin: open a second tab, log in as admin, and go to <strong>Security codes</strong>. Each tab keeps its own login.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fill('jane@parakeet.bank', 'demo123')} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Customer: jane / demo123</button>
            <button onClick={() => fill('admin@parakeet.bank', 'admin123')} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Admin: admin / admin123</button>
          </div>
        </div>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="User ID (email)">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="size-4 accent-brand" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Save user ID
        </label>
        <ErrorNote error={error} />
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
        <p className="text-center text-sm">
          <Link to="/register" className="text-brand underline">Enroll</Link>
          <span className="mx-2 text-slate-300">|</span>
          <span className="inline-flex items-center gap-1 text-slate-500"><Lock className="size-3.5" /> Secured with a one-time passcode</span>
        </p>
      </form>
    </AuthShell>
  )
}
