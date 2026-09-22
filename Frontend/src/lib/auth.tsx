import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'

export type Role = 'bidder' | 'tender_caller' | 'official'

export interface User {
  id: number
  email: string
  company_name: string
  role: Role
  email_verified: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  loginWithGoogle: (credential: string) => Promise<User>
  register: (payload: Record<string, unknown>) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api.get('/api/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post('/api/auth/login', { email, password })
    setToken(res.token)
    setUser(res.user)
    return res.user as User
  }

  async function loginWithGoogle(credential: string) {
    const res = await api.post('/api/auth/google', { credential })
    setToken(res.token)
    setUser(res.user)
    return res.user as User
  }

  async function register(payload: Record<string, unknown>) {
    const res = await api.post('/api/auth/register', payload)
    setToken(res.token)
    setUser(res.user)
    return res.user as User
  }

  function logout() {
    // Best-effort: revoke server-side (bumps token_version so the token
    // can't be replayed) even though we clear it locally either way.
    api.post('/api/auth/logout').catch(() => {})
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
