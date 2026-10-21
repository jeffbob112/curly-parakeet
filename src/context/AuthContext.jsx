import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'
import { isOtpVerified } from '../services/otp'

const AuthContext = createContext(null)

// Keeps the logged-in user's profile (including live balances) available everywhere,
// plus whether they've passed the one-time-passcode step this session.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  useEffect(() => api.onAuthChange((u) => {
    setUser(u)
    setLoading(false)
  }), [])

  const refreshOtp = useCallback(() => setTick((t) => t + 1), [])
  const otpVerified = isOtpVerified(user?.uid)

  return <AuthContext.Provider value={{ user, loading, otpVerified, refreshOtp }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
