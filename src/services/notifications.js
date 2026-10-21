// Simulated Inbox. Stores messages (OTP texts, transaction alerts) in this browser.
// In a real bank these would be SMS/email/push messages sent by a server.
import { emitDataChange } from './events'

const key = (uid) => `parakeet_inbox_${uid}`

export function listNotifications(uid) {
  try {
    return JSON.parse(localStorage.getItem(key(uid)) || '[]')
  } catch {
    return []
  }
}

export function notify(uid, { title, body, kind = 'info' }) {
  if (!uid) return
  const list = [{ id: Date.now() + Math.random(), title, body, kind, createdAt: Date.now(), read: false }, ...listNotifications(uid)].slice(0, 100)
  try { localStorage.setItem(key(uid), JSON.stringify(list)) } catch { /* storage full: drop silently */ }
  emitDataChange()
}

export function markAllRead(uid) {
  localStorage.setItem(key(uid), JSON.stringify(listNotifications(uid).map((n) => ({ ...n, read: true }))))
  emitDataChange()
}

export const unreadCount = (uid) => listNotifications(uid).filter((n) => !n.read).length
