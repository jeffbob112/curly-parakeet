// The grouped account list from the home screen: Banking / Credit Cards / Loans / Investments.
import { ChevronRight, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ACCOUNT_TYPES, GROUPS, accountList, accountName, accountValue, ageText, available, isLiability } from '../lib/accounts'
import { STOCKS } from '../lib/constants'
import { money } from '../lib/format'
import Logo from './Logo'

function dayChange(acc) {
  return (acc.holdings || []).reduce((s, h) => s + h.shares * h.price * ((STOCKS.find((x) => x.symbol === h.symbol)?.change || 0) / 100), 0)
}

function AccountRow({ acc }) {
  const t = ACCOUNT_TYPES[acc.id]
  return (
    <Link to={`/app/accounts/${acc.id}`} className="flex items-center gap-3 py-3.5 transition hover:bg-slate-50 sm:-mx-2 sm:rounded-lg sm:px-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900">{t.label}</span>
        <span className="block text-sm text-slate-600">{t.short} - {String(acc.number).slice(-4)}</span>
        <span className="block text-xs text-slate-400">Open {ageText(acc.openedAt)}</span>
      </span>
      <span className="text-right">
        <span className="block text-lg font-semibold tabular-nums text-slate-900">{money(accountValue(acc))}</span>
        <span className="block text-xs text-slate-500">
          {isLiability(acc) ? `${money(available(acc))} available` : acc.id === 'inv'
            ? <span className={dayChange(acc) >= 0 ? 'text-green-700' : 'text-accent'}>{dayChange(acc) >= 0 ? '+' : '−'}{money(Math.abs(dayChange(acc)))} today</span>
            : acc.id === 'sav' ? `${t.apy}% APY` : 'Available'}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}

export function AccountGroup({ title, accounts }) {
  const [open, setOpen] = useState(true)
  const total = accounts.reduce((s, a) => s + accountValue(a), 0)
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <div className="brand-strip h-1.5" />
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 pt-4 sm:px-5" aria-expanded={open}>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className="flex items-center gap-2 text-sm text-slate-500">
          {!open && money(total)}
          <ChevronUp className={`size-5 transition ${open ? '' : 'rotate-180'}`} />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-2 sm:px-5">
          <div className="mt-2"><Logo small /></div>
          <div className="divide-y divide-slate-100">{accounts.map((a) => <AccountRow key={a.id} acc={a} />)}</div>
        </div>
      )}
    </section>
  )
}

export default function AccountSections({ user }) {
  const accounts = accountList(user)
  return GROUPS.map((g) => {
    const list = accounts.filter((a) => ACCOUNT_TYPES[a.id].group === g)
    return list.length ? <AccountGroup key={g} title={g} accounts={list} /> : null
  })
}

export { accountName }
