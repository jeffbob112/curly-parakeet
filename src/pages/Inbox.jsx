import { Bell, CheckCheck, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import { Button, Card, EmptyState } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { dateTime } from '../lib/format'
import { useData } from '../lib/hooks'
import { listNotifications, markAllRead } from '../services/notifications'

const ICON = { security: ShieldCheck, transaction: Wallet, info: Bell }

export default function Inbox() {
  const { user } = useAuth()
  const { data: items } = useData(async () => listNotifications(user.uid), [user.uid])
  // Opening the inbox marks everything as read (after a short moment so the dots are visible).
  useEffect(() => {
    const t = setTimeout(() => markAllRead(user.uid), 1500)
    return () => clearTimeout(t)
  }, [user.uid])

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Inbox" subtitle="Security codes and account alerts."
        action={<Button variant="ghost" onClick={() => markAllRead(user.uid)}><CheckCheck className="size-4" /> Mark all read</Button>} />
      <Card strip>
        {!items?.length ? <EmptyState icon={Bell} title="No messages" text="Alerts about your accounts will appear here." /> : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const Icon = ICON[n.kind] || Bell
              return (
                <li key={n.id} className="flex gap-3 py-3">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${n.kind === 'security' ? 'bg-amber-100 text-amber-700' : 'bg-brand/10 text-brand'}`}><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">{n.title}{!n.read && <span className="size-2 rounded-full bg-accent" />}</p>
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{dateTime(n.createdAt)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
