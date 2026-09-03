import type { ReactNode } from 'react'
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
import { GoalsPage } from './pages/GoalsPage'
import { PersonalBudgetPage } from './pages/PersonalBudgetPage'
import { ImportExportPage } from './pages/ImportExportPage'
import { QuickEntryPage } from './pages/QuickEntryPage'
import { AppShell } from './components/AppShell'

// Kimlik dogrulamasi gereken her sayfa ayni kabuga (ust baslik + alt
// sekme cubugu + menu) sarilir; boylece modul degistirmek icin her
// seferinde ana sayfaya donmek gerekmez.
function Shell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <RequireAuth>
      <AppShell title={title} subtitle={subtitle}>
        {children}
      </AppShell>
    </RequireAuth>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/giris" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Shell title="Ortak Bütçe" subtitle="Bu ayın özeti">
              <HomePage />
            </Shell>
          }
        />
        <Route
          path="/ayarlar"
          element={
            <Shell title="Ayarlar" subtitle="Hesaplar, kategoriler, kur">
              <SettingsPage />
            </Shell>
          }
        />
        <Route
          path="/harcamalar"
          element={
            <Shell title="Harcamalar" subtitle="Kayıt gir, düzenle, listele">
              <ExpensesPage />
            </Shell>
          }
        />
        <Route
          path="/gelirler"
          element={
            <Shell title="Gelirler" subtitle="Maaş, burs, Sperrkonto">
              <IncomesPage />
            </Shell>
          }
        />
        <Route
          path="/transferler"
          element={
            <Shell title="Transferler" subtitle="Ortak Kasa, tasarruf, hedef">
              <TransfersPage />
            </Shell>
          }
        />
        <Route
          path="/hesaplar"
          element={
            <Shell title="Hesap Bakiyeleri" subtitle="Bakiyeler ve katkı özeti">
              <BalancesPage />
            </Shell>
          }
        />
        <Route
          path="/pano"
          element={
            <Shell title="Ay Panosu" subtitle="Özet, kırılım, kontroller">
              <DashboardPage />
            </Shell>
          }
        />
        <Route
          path="/sabit-giderler"
          element={
            <Shell title="Sabit Giderler" subtitle="Kira, sigorta, abonelikler">
              <RecurringPage />
            </Shell>
          }
        />
        <Route
          path="/hedefler"
          element={
            <Shell title="Hedefler" subtitle="Birikim hedefleri">
              <GoalsPage />
            </Shell>
          }
        />
        <Route
          path="/kisisel-butce"
          element={
            <Shell title="Kişisel Bütçe" subtitle="Can ve Tuğçe planı">
              <PersonalBudgetPage />
            </Shell>
          }
        />
        <Route
          path="/ice-disa-aktar"
          element={
            <Shell title="İçe/Dışa Aktar" subtitle="Excel yedek ve aktarım">
              <ImportExportPage />
            </Shell>
          }
        />
        <Route
          path="/hizli-giris"
          element={
            <Shell title="Hızlı Giriş" subtitle="Tek ekranda harcama kaydı">
              <QuickEntryPage />
            </Shell>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
