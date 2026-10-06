// Menu items for the customer app and the admin dashboard.
import { ArrowLeftRight, Home, LayoutDashboard, PlusCircle, ReceiptText, User } from 'lucide-react'

export const customerNav = [
  { to: '/app', label: 'Accounts', icon: Home, end: true },
  { to: '/app/transfer', label: 'Pay & Transfer', short: 'Transfer', icon: ArrowLeftRight },
  { to: '/app/deposit', label: 'Deposit', icon: PlusCircle },
  { to: '/app/activity', label: 'Activity', icon: ReceiptText },
  { to: '/app/profile', label: 'Profile', icon: User },
]

export const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Customers', icon: User },
  { to: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
]
