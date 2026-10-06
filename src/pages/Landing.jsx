import { ArrowRight, BarChart3, Lock, PiggyBank, Send, Smartphone, Wallet } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { DemoBanner } from '../components/AppLayout'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: Wallet, title: 'Checking', text: 'See your balance and every transaction in one place.' },
  { icon: Send, title: 'Instant transfers', text: 'Send money to any Parakeet account in seconds.' },
  { icon: PiggyBank, title: 'Mobile deposit', text: 'Add money to your account from anywhere.' },
  { icon: BarChart3, title: 'Spending insights', text: 'Charts that show where your money goes.' },
  { icon: Smartphone, title: 'Works like an app', text: 'Add it to your home screen for a full-screen experience.' },
  { icon: Lock, title: 'Secure sign-in', text: 'Your account is protected by secure authentication.' },
]

export default function Landing() {
  const { user } = useAuth()
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />

  return (
    <div className="min-h-screen bg-white">
      <DemoBanner />
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5">Log in</Link>
            <Link to="/register" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">Open account</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-dark via-brand to-[#2340c9] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">Banking made simple</p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">Your money, <br />right in your pocket.</h1>
            <p className="mt-4 max-w-md text-white/80">Open a free checking account in under a minute. Deposit, withdraw, transfer and track your spending with beautiful charts.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand hover:bg-white/90">
                Get started <ArrowRight className="size-4" />
              </Link>
              <Link to="/login" className="rounded-full border border-white/50 px-6 py-3 font-semibold hover:bg-white/10">Log in</Link>
            </div>
          </div>
          {/* Card illustration */}
          <div className="relative mx-auto h-56 w-full max-w-sm">
            <div className="absolute inset-0 translate-x-6 translate-y-6 rotate-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 shadow-2xl" />
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-accent to-rose-800 p-6 shadow-2xl">
              <Logo light />
              <div>
                <p className="font-mono text-lg tracking-widest">•••• •••• •••• 4821</p>
                <div className="mt-2 flex justify-between text-xs text-white/80"><span>JANE COOPER</span><span>12/29</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offer cards */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-50 p-6">
            <p className="text-sm font-semibold uppercase text-brand">New checking customers</p>
            <p className="mt-1 text-2xl font-bold text-accent">Free account, no monthly fee</p>
            <p className="mt-2 text-sm text-slate-600">Start by opening a new account. No minimum balance required.</p>
            <Link to="/register" className="mt-4 inline-block text-sm font-semibold text-brand underline">Open an account</Link>
          </div>
          <div className="rounded-2xl bg-rose-50 p-6">
            <p className="text-sm font-semibold uppercase text-brand">Track every dollar</p>
            <p className="mt-1 text-2xl font-bold text-accent">See where your money goes</p>
            <p className="mt-2 text-sm text-slate-600">Spending by category, monthly money in vs. money out, and a full history.</p>
            <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-brand underline">Try the demo</Link>
          </div>
        </div>

        <h2 className="mt-14 text-center text-2xl font-bold text-slate-900">Everything you need</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-5">
              <Icon className="size-7 text-accent" />
              <p className="mt-3 font-semibold text-brand">{title}</p>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-brand py-8 text-center text-sm text-white/80">
        <Logo light className="mb-3" />
        <p>Parakeet Bank is a learning project. It is not a real bank.</p>
      </footer>
    </div>
  )
}
