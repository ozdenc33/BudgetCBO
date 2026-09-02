import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/giris" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
