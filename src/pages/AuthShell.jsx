import { Link } from 'react-router-dom'
import { DemoBanner } from '../components/AppLayout'
import Logo from '../components/Logo'

// Shared frame for Login / Register: centered card with the red/blue strip.
export default function AuthShell({ title, children, footer }) {
  return (
    <div className="min-h-screen bg-white">
      <DemoBanner />
      <header className="flex h-14 items-center justify-center border-b border-slate-200">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-6 text-center text-2xl text-slate-900">{title}</h1>
        <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="brand-strip h-1.5" />
          <div className="p-6">{children}</div>
        </div>
        {footer}
      </main>
    </div>
  )
}
