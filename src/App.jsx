import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { Spinner } from './components/ui'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { adminNav } from './lib/nav'
import AccountDetail from './pages/AccountDetail'
import Activity from './pages/Activity'
import AdminOverview from './pages/admin/AdminOverview'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminUsers from './pages/admin/AdminUsers'
import Dashboard from './pages/Dashboard'
import Deposit from './pages/Deposit'
import Expenses from './pages/Expenses'
import Inbox from './pages/Inbox'
import Invest from './pages/Invest'
import Landing from './pages/Landing'
import Login from './pages/Login'
import PayTransfer from './pages/PayTransfer'
import Products from './pages/Products'
import Profile from './pages/Profile'
import Register from './pages/Register'
import TransferForm from './pages/TransferForm'
import Verify from './pages/Verify'

// Only lets logged-in AND OTP-verified users through (and only admins when adminOnly is set).
function RequireAuth({ adminOnly = false, children }) {
  const { user, loading, otpVerified } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!otpVerified) return <Navigate to="/verify" replace state={{ from: location.pathname }} />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/app" replace />
  return children
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <div className="pt-24"><Spinner /></div>

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />

      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="transfer" element={<PayTransfer />} />
        <Route path="transfer/:mode" element={<TransferForm />} />
        <Route path="deposit" element={<Deposit />} />
        <Route path="invest" element={<Invest />} />
        <Route path="activity" element={<Activity />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="products" element={<Products />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/admin" element={<RequireAuth adminOnly><AppLayout nav={adminNav} tabs={adminNav} admin /></RequireAuth>}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:uid" element={<AdminUserDetail />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
