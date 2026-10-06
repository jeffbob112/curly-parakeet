import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, ErrorNote, Field, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import api, { firebaseConfigured } from '../services/api'
import AuthShell from './AuthShell'

const SAVED_KEY = 'parakeet_saved_email'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => localStorage.getItem(SAVED_KEY) || '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(SAVED_KEY)))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={location.state?.from || (user.role === 'admin' ? '/admin' : '/app')} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.login(email.trim(), password)
      if (remember) localStorage.setItem(SAVED_KEY, email.trim())
      else localStorage.removeItem(SAVED_KEY)
      navigate(location.state?.from || '/app', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
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
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fill('jane@parakeet.bank', 'demo123')} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Customer: jane / demo123</button>
            <button onClick={() => fill('admin@parakeet.bank', 'admin123')} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Admin: admin / admin123</button>
          </div>
        </div>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="size-4 accent-brand" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Save email
        </label>
        <ErrorNote error={error} />
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
        <p className="text-center text-sm text-slate-600">
          New here? <Link to="/register" className="font-semibold text-brand underline">Enroll</Link>
        </p>
      </form>
    </AuthShell>
  )
}
