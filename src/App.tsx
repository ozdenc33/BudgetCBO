import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { IncomesPage } from './pages/IncomesPage'
import { TransfersPage } from './pages/TransfersPage'
import { BalancesPage } from './pages/BalancesPage'
import { DashboardPage } from './pages/DashboardPage'
import { RecurringPage } from './pages/RecurringPage'

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
        <Route
          path="/ayarlar"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/harcamalar"
          element={
            <RequireAuth>
              <ExpensesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/gelirler"
          element={
            <RequireAuth>
              <IncomesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/transferler"
          element={
            <RequireAuth>
              <TransfersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/hesaplar"
          element={
            <RequireAuth>
              <BalancesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/pano"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/sabit-giderler"
          element={
            <RequireAuth>
              <RecurringPage />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
