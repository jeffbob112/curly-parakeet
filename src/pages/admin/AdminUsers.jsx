import { ChevronRight, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Avatar, Badge, Card, EmptyState, ErrorNote, Spinner } from '../../components/ui'
import { accountList, netWorth } from '../../lib/accounts'
import { money, shortDate } from '../../lib/format'
import { useData } from '../../lib/hooks'
import api from '../../services/api'

export default function AdminUsers() {
  const [q, setQ] = useState('')
  const { data: users, loading, error } = useData(() => api.listUsers())

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (users || []).filter((u) => !n || `${u.fullName} ${u.email} ${Object.values(u.accounts || {}).map((a) => a.number).join(' ')} ${u.phone}`.toLowerCase().includes(n))
  }, [users, q])

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Tap a customer to edit their profile, balance and transactions." />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, account number…"
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-sm" />
      </div>
      <ErrorNote error={error} />
      <Card strip>
        {loading ? <Spinner /> : !filtered.length ? <EmptyState icon={Users} title="No customers found" /> : (
          <>
            {/* phone list */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map((u) => (
                <li key={u.uid}>
                  <Link to={`/admin/users/${u.uid}`} className="flex items-center gap-3 py-3">
                    <Avatar name={u.fullName} color={u.avatarColor} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.fullName} {u.role === 'admin' && <Badge color="blue">admin</Badge>}</span>
                      <span className="block truncate text-xs text-slate-500">{u.email}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums">{money(netWorth(u))}</span>
                      {u.status === 'frozen' && <Badge color="red">frozen</Badge>}
                    </span>
                    <ChevronRight className="size-4 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
            {/* desktop table */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-3 font-medium">Customer</th>
                  <th className="py-3 pr-3 font-medium">Checking #</th>
                  <th className="py-3 pr-3 font-medium">Role</th>
                  <th className="py-3 pr-3 font-medium">Status</th>
                  <th className="py-3 pr-3 font-medium">Joined</th>
                  <th className="py-3 text-right font-medium">Net worth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50">
                    <td className="py-3 pr-3">
                      <Link to={`/admin/users/${u.uid}`} className="flex items-center gap-3">
                        <Avatar name={u.fullName} color={u.avatarColor} size="sm" />
                        <span><span className="block font-medium text-brand hover:underline">{u.fullName}</span><span className="text-xs text-slate-500">{u.email}</span></span>
                      </Link>
                    </td>
                    <td className="py-3 pr-3 font-mono">{u.accounts?.chk?.number || '—'}<span className="block font-sans text-xs text-slate-500">{accountList(u).length} account{accountList(u).length === 1 ? '' : 's'}</span></td>
                    <td className="py-3 pr-3"><Badge color={u.role === 'admin' ? 'blue' : 'slate'}>{u.role}</Badge></td>
                    <td className="py-3 pr-3"><Badge color={u.status === 'frozen' ? 'red' : 'green'}>{u.status}</Badge></td>
                    <td className="py-3 pr-3 text-slate-600">{shortDate(u.createdAt)}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{money(netWorth(u))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  )
}
