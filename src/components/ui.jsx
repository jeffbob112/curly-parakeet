// Reusable building blocks. Keeping them here makes every screen look consistent.
import { Loader2, X } from 'lucide-react'
import { useEffect } from 'react'
import { initials } from '../lib/format'

export function Button({ variant = 'primary', loading, className = '', children, ...props }) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-light',
    accent: 'bg-accent text-white hover:bg-accent-dark',
    outline: 'border border-brand text-brand bg-white hover:bg-brand/5',
    ghost: 'text-brand hover:bg-brand/5',
    danger: 'bg-white text-accent border border-accent/40 hover:bg-accent/5',
  }
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-accent">{error}</span>}
    </label>
  )
}

const inputCls = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100'

export const Input = (props) => <input className={inputCls} {...props} />
export const Select = ({ children, ...props }) => <select className={inputCls} {...props}>{children}</select>
export const Textarea = (props) => <textarea className={`${inputCls} py-2`} rows={3} {...props} />

// Big amount input with a $ prefix
export function AmountInput(props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-slate-400">$</span>
      <input
        type="number" inputMode="decimal" step="0.01" min="0.01" placeholder="0.00"
        className="w-full rounded-xl border border-slate-300 bg-white py-4 pl-10 pr-4 text-3xl font-semibold text-brand outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        {...props}
      />
    </div>
  )
}

export function Card({ title, action, strip, className = '', children }) {
  return (
    <section className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 ${className}`}>
      {strip && <div className="brand-strip h-1.5" />}
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function Badge({ color = 'slate', children }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-800',
    red: 'bg-rose-100 text-rose-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>
}

export function Avatar({ name, color = '#0b2a5b', size = 'md' }) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizes[size]}`} style={{ background: color }}>
      {initials(name)}
    </span>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 className="size-5 animate-spin" /> {label}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {Icon && <Icon className="size-10 text-slate-300" />}
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="max-w-xs text-sm text-slate-500">{text}</p>}
      {children}
    </div>
  )
}

export function ErrorNote({ error }) {
  if (!error) return null
  return <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error.message || String(error)}</p>
}

// Bottom sheet on phones, centered dialog on larger screens.
export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className="animate-slide-up pb-safe max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
