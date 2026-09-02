import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page-loading">Yukleniyor...</div>
  }

  if (!user) {
    return <Navigate to="/giris" replace />
  }

  return <>{children}</>
}
