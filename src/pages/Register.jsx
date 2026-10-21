import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, ErrorNote, Field, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import AuthShell from './AuthShell'

export default function Register() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (user && !loading) return <Navigate to="/verify" replace />

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirm) return setError(new Error('Passwords do not match.'))
    if (form.password.length < 6) return setError(new Error('Password must be at least 6 characters.'))
    setLoading(true)
    try {
      await api.register({ fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password })
      navigate('/verify', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Open your account">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <Input autoComplete="name" required value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Phone (optional)">
          <Input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" hint="At least 6 characters">
            <Input type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
          </Field>
        </div>
        <ErrorNote error={error} />
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
        <p className="text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-semibold text-brand underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  )
}
