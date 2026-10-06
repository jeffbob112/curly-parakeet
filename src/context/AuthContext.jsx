import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Keeps the logged-in user's profile (including live balance) available everywhere.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => api.onAuthChange((u) => {
    setUser(u)
    setLoading(false)
  }), [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
