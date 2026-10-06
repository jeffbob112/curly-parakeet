// Frame around every logged-in screen.
// Phones: top bar + bottom tab bar. Desktop (lg+): left sidebar.
import { Home, LogOut, Shield } from 'lucide-react'
import { customerNav } from '../lib/nav'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { firebaseConfigured } from '../services/api'
import Logo from './Logo'
import { Avatar } from './ui'

export function DemoBanner() {
  if (firebaseConfigured) return null
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
      Demo mode: data is saved in this browser only. Add Firebase keys to <code>.env.local</code> to go live.
    </div>
  )
}

export default function AppLayout({ nav = customerNav, admin = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const logout = async () => {
    await api.logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <DemoBanner />
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link to={admin ? '/admin' : '/app'} className="flex items-center gap-2">
            <Logo />
            {admin && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Admin</span>}
          </Link>
          <div className="ml-auto flex items-center gap-1">
            {user?.role === 'admin' && (
              <Link to={admin ? '/app' : '/admin'} className="flex flex-col items-center rounded-lg px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100">
                {admin ? <Home className="size-5" /> : <Shield className="size-5" />}
                {admin ? 'My bank' : 'Admin'}
              </Link>
            )}
            <button onClick={logout} className="flex flex-col items-center rounded-lg px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100">
              <LogOut className="size-5" /> Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-surface p-3">
            <Avatar name={user?.fullName} color={user?.avatarColor} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.fullName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="size-5" /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Page content. Extra bottom padding on phones so the tab bar doesn't cover it. */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
          <Outlet />
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
        <div className="mx-auto flex max-w-xl">
          {nav.map(({ to, label, short, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-slate-500'}`}>
              {({ isActive }) => (
                <>
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-brand/10' : ''}`}>
                    <Icon className="size-5" />
                  </span>
                  {short || label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
