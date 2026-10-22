// Menu items for the customer app and the admin dashboard.
import {
  ArrowLeftRight, BarChart3, Camera, Home, Inbox, KeyRound, LayoutDashboard, LineChart, ReceiptText, ShoppingCart, User,
} from 'lucide-react'

// Bottom tab bar on phones (like the screenshots)
export const customerTabs = [
  { to: '/app', label: 'Accounts', icon: Home, end: true },
  { to: '/app/transfer', label: 'Pay & Transfer', icon: ArrowLeftRight },
  { to: '/app/deposit', label: 'Deposit Checks', icon: Camera },
  { to: '/app/invest', label: 'Invest', icon: LineChart },
  { to: '/app/activity', label: 'Activity', icon: ReceiptText },
]

// Full menu (drawer on phones, sidebar on desktop)
export const customerNav = [
  ...customerTabs,
  { to: '/app/expenses', label: 'Expenses & insights', icon: BarChart3 },
  { to: '/app/inbox', label: 'Inbox', icon: Inbox },
  { to: '/app/products', label: 'Products', icon: ShoppingCart },
  { to: '/app/profile', label: 'Profile & settings', icon: User },
]

export const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/otp', label: 'Security codes', icon: KeyRound },
  { to: '/admin/users', label: 'Customers', icon: User },
  { to: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
]
