// Frame around every logged-in screen, modelled on the mobile banking screenshots:
//   top bar: Menu · (logo) · Inbox · Products · Log Out
//   phones: bottom tab bar + slide-out menu.   desktop (lg+): left sidebar.
import { Home, Inbox, LogOut, Menu, Shield, ShoppingCart, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ageText } from '../lib/accounts'
import { useData } from '../lib/hooks'
import { customerNav, customerTabs } from '../lib/nav'
import api, { firebaseConfigured } from '../services/api'
import { unreadCount } from '../services/notifications'
import Logo from './Logo'
import { Avatar } from './ui'

export function DemoBanner() {
  if (firebaseConfigured) return null
  return (
    <div className="bg-amber-100 px-4 py-1 text-center text-[11px] text-amber-900">
      Demo mode: data is saved in this browser only.
    </div>
  )
}

function TopButton({ icon: Icon, label, badge, ...props }) {
  const Tag = props.to ? Link : 'button'
  return (
    <Tag {...props} className="relative flex min-w-12 flex-col items-center rounded-lg px-1.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100">
      <Icon className="size-5" strokeWidth={1.6} />
      {label}
      {badge > 0 && <span className="absolute right-1.5 top-0 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>}
    </Tag>
  )
}

function NavItems({ nav, onClick }) {
  return nav.map(({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} onClick={onClick}
      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
      <Icon className="size-5" /> {label}
    </NavLink>
  ))
}

export default function AppLayout({ nav = customerNav, tabs = customerTabs, admin = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const { data: unread } = useData(async () => unreadCount(user.uid), [user.uid])

  const logout = async () => {
    await api.logout()
    navigate('/login')
  }

  const profileCard = (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
      <Avatar name={user?.fullName} color={user?.avatarColor} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{user?.fullName}</p>
        <p className="truncate text-xs text-slate-500">Member for {ageText(user?.memberSince || user?.createdAt)}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-2 sm:px-4">
          <TopButton icon={Menu} label="Menu" onClick={() => setDrawer(true)} aria-label="Open menu" />
          <Link to={admin ? '/admin' : '/app'} className="hidden items-center gap-2 px-2 sm:flex">
            <Logo />
            {admin && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Admin</span>}
          </Link>
          <div className="ml-auto flex items-center">
            {user?.role === 'admin' && (
              <TopButton to={admin ? '/app' : '/admin'} icon={admin ? Home : Shield} label={admin ? 'My bank' : 'Admin'} />
            )}
            {!admin && <TopButton to="/app/inbox" icon={Inbox} label="Inbox" badge={unread} />}
            {!admin && <TopButton to="/app/products" icon={ShoppingCart} label="Products" />}
            <TopButton icon={LogOut} label="Log Out" onClick={logout} />
          </div>
        </div>
      </header>

      {/* Slide-out menu */}
      {drawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40" onClick={() => setDrawer(false)}>
          <aside className="animate-slide-up flex h-full w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setDrawer(false)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close menu"><X className="size-5" /></button>
            </div>
            {profileCard}
            <nav className="flex flex-col gap-1"><NavItems nav={nav} onClick={() => setDrawer(false)} /></nav>
            {user?.role === 'admin' && (
              <Link to={admin ? '/app' : '/admin'} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-accent hover:bg-rose-50">
                <Shield className="size-5" /> {admin ? 'Back to my bank' : 'Admin dashboard'}
              </Link>
            )}
            <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <LogOut className="size-5" /> Log out
            </button>
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:flex">
          {profileCard}
          <nav className="flex flex-col gap-1"><NavItems nav={nav} /></nav>
        </aside>

        {/* Extra bottom padding on phones so the tab bar doesn't cover content */}
        <main className="min-w-0 flex-1 px-3 pb-28 pt-3 sm:px-6 lg:pb-10 lg:pt-6">
          <Outlet />
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
        <div className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-medium leading-tight ${isActive ? 'text-brand' : 'text-slate-500'}`}>
              {({ isActive }) => (
                <>
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-brand/10' : ''}`}><Icon className="size-5" strokeWidth={1.7} /></span>
                  <span className="text-center">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
