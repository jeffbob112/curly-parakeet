// Picks the backend: Firebase if keys are configured in .env.local, otherwise the demo backend.
// Every screen imports from HERE, so the UI never cares which backend is in use.
// We also wrap a few actions to drop an alert into the user's Inbox when they succeed.

import { money } from '../lib/format'
import * as demo from './demoBackend'
import { notify } from './notifications'
import { clearOtp } from './otp'

export const firebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY)

const backend = firebaseConfigured ? await import('./firebaseBackend') : demo

const withAlert = (fn, message) => async (uid, input) => {
  const result = await fn(uid, input)
  notify(uid, { kind: 'transaction', ...message(input) })
  return result
}

const api = {
  ...backend,
  logout: async () => {
    clearOtp()
    await backend.logout()
  },
  deposit: withAlert(backend.deposit, (i) => ({ title: 'Deposit received', body: `We received your ${i.checkImages ? 'mobile check ' : ''}deposit of ${money(i.amount)}.` })),
  withdraw: withAlert(backend.withdraw, (i) => ({ title: 'Withdrawal', body: `${money(i.amount)} was withdrawn from your account.` })),
  payBill: withAlert(backend.payBill, (i) => ({ title: 'Bill paid', body: `You paid ${money(i.amount)} to ${i.payee}.` })),
  transferInternal: withAlert(backend.transferInternal, (i) => ({ title: 'Transfer complete', body: `${money(i.amount)} moved between your accounts.` })),
  sendMoney: withAlert(backend.sendMoney, (i) => ({ title: 'Money sent', body: `You sent ${money(i.amount)}${i.recipientName ? ` to ${i.recipientName}` : ''}.` })),
  wire: withAlert(backend.wire, (i) => ({ title: 'Wire sent', body: `Your ${i.international ? 'international' : 'domestic'} wire of ${money(i.amount)} to ${i.recipientName} is on its way.` })),
  trade: withAlert(backend.trade, (i) => ({ title: 'Order filled', body: `Your order to ${i.side} ${i.shares} ${i.symbol} was filled.` })),
}

export default api
