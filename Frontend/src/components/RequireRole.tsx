import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../lib/auth'
import { Spinner } from './ui'

const LOGIN_FOR: Record<Role, string> = {
  bidder: '/login',
  tender_caller: '/login/buyer',
  official: '/login/official',
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>
  if (!user) return <Navigate to={LOGIN_FOR[role]} replace />
  if (user.role !== role) return <Navigate to={LOGIN_FOR[user.role]} replace />
  return <>{children}</>
}
