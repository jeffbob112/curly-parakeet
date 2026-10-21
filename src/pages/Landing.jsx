import { CalendarDays, Car, CreditCard, GraduationCap, Home, LineChart, PiggyBank, Store, Smartphone, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { DemoBanner } from '../components/AppLayout'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

// The four card offers row, like the inspiration screenshot.
const CARDS = [
  { big: '$200', sub: 'online bonus offer', name: 'Customized Cash Rewards', cta: '6% choice category cash back offer', bg: 'from-accent to-rose-800' },
  { big: '$200', sub: 'online bonus offer', name: 'Unlimited Cash Rewards', cta: '2% unlimited cash back offer', bg: 'from-slate-300 to-slate-500' },
  { big: '25,000', sub: 'online bonus points offer', name: 'Travel Rewards', cta: 'Unlimited 1.5 points for every $1 spent', bg: 'from-blue-700 to-indigo-900' },
  { big: '0%', sub: 'intro APR offer', name: 'Parakeet Card', cta: 'Intro APR offer for 21 billing cycles', bg: 'from-slate-50 to-slate-200', dark: true },
]

const LINKS = [
  [Wallet, 'Checking'], [PiggyBank, 'Savings & CDs'], [CreditCard, 'Credit Cards'], [Home, 'Home Loans'],
  [Car, 'Auto Loans'], [Store, 'Small Business'], [LineChart, 'Investing'], [GraduationCap, 'Banking for students and young adults'],
]

function MiniCard({ c }) {
  return (
    <div className={`relative aspect-[1.586] w-full rounded-lg bg-gradient-to-br ${c.bg} p-2 shadow-md ring-1 ring-white/30`}>
      <Logo light={!c.dark} small />
      <span className="absolute bottom-2 left-2 h-3 w-4 rounded-sm bg-gradient-to-br from-amber-200 to-amber-400" />
      <span className={`absolute bottom-1.5 right-2 text-[9px] font-bold italic ${c.dark ? 'text-brand' : 'text-white'}`}>VISA</span>
    </div>
  )
}

export default function Landing() {
  const { user, otpVerified } = useAuth()
  const [promo, setPromo] = useState(true)
  if (user && otpVerified) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />

  return (
    <div className="min-h-screen bg-white pb-16">
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

      <section className="bg-gradient-to-br from-[#0a1fbf] via-[#1d33d6] to-[#2340c9] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-semibold md:text-3xl">Choose the card that works for you</h1>
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-5">
            {CARDS.map((c) => (
              <div key={c.name} className="flex flex-col items-center text-center">
                <p className="text-2xl font-light sm:text-5xl">{c.big}</p>
                <p className="text-[10px] leading-tight text-white/90 sm:text-sm">{c.sub}</p>
                <p className="mb-2 text-[10px] text-white/80 sm:text-sm">No annual fee.</p>
                <MiniCard c={c} />
                <p className="mt-2 text-[10px] font-medium leading-tight sm:text-sm">{c.name}</p>
                <Link to="/register" className="mt-2 w-full rounded-md bg-white px-1 py-1.5 text-[9px] font-medium leading-tight text-brand underline sm:text-xs">{c.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-4 px-6 py-8 text-sm md:max-w-3xl md:grid-cols-4">
        {LINKS.map(([Icon, label]) => (
          <Link key={label} to="/register" className="flex items-center gap-2 text-brand hover:underline">
            <Icon className="size-5 shrink-0 text-slate-700" /> {label}
          </Link>
        ))}
      </section>
      <div className="flex flex-wrap justify-center gap-3 px-4">
        <Link to="/register" className="flex items-center gap-2 rounded-md border border-accent px-4 py-2 text-sm text-accent"><Smartphone className="size-4" /> Get the free app</Link>
        <Link to="/login" className="flex items-center gap-2 rounded-md border border-brand px-4 py-2 text-sm text-brand"><CalendarDays className="size-4" /> Schedule an appointment</Link>
      </div>

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200">
          <div className="flex h-36 items-center justify-center gap-6 bg-blue-100">
            <p className="text-center font-semibold text-brand"><span className="block text-sm line-through decoration-accent">$100</span><span className="block text-xl">$300</span><span className="block text-3xl">$500</span></p>
            <div className="w-16"><MiniCard c={CARDS[0]} /></div>
          </div>
          <div className="p-5">
            <p className="text-sm font-semibold uppercase text-brand">New checking customers</p>
            <p className="text-lg text-accent">Cash offer up to $500</p>
            <p className="mt-1 text-sm text-slate-600">Start by opening a new eligible checking account.</p>
            <Link to="/register" className="mt-3 inline-block text-sm text-brand">See details</Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200">
          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 text-5xl">📈</div>
          <div className="p-5">
            <p className="text-sm font-semibold uppercase text-brand">Track every dollar</p>
            <p className="text-lg text-accent">See where your money goes</p>
            <p className="mt-1 text-sm text-slate-600">Expense charts, money-flow insights and two years of history in your pocket.</p>
            <Link to="/login" className="mt-3 inline-block text-sm text-brand">Try the demo</Link>
          </div>
        </div>
      </section>

      <footer className="mt-12 bg-brand py-8 text-center text-sm text-white/80">
        <Logo light className="mb-3" />
        <p>Parakeet Bank is a learning project. It is not a real bank.</p>
      </footer>

      {promo && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm">
          <CreditCard className="size-5 shrink-0 text-accent" />
          <p className="flex-1">Earn 6% cash back on your choice category purchases for the first year! <Link to="/register" className="text-brand underline">See offer details</Link></p>
          <button onClick={() => setPromo(false)} aria-label="Dismiss"><X className="size-5 text-slate-500" /></button>
        </div>
      )}
    </div>
  )
}
