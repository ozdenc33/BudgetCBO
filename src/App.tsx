import { Suspense, lazy, type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { AppShell } from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ToastProvider'
import { DataProvider } from './data/DataProvider'
import { WelcomeGreeting } from './components/WelcomeGreeting'

/**
 * Sayfalar rota bazinda ayri paketlere bolunur.
 *
 * NEDEN: Tek parca ana paket ~850 KB (gzip ~218 KB) idi ve telefonda
 * ilk acilista tamami indiriliyordu; oysa acilista yalnizca Ana Sayfa
 * gerekiyor. Ana Sayfa ve giris ekrani bilerek lazy DEGIL, cunku ilk
 * gorunen ekranlar onlar.
 */
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const ExpensesPage = lazy(() =>
  import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })),
)
const IncomesPage = lazy(() =>
  import('./pages/IncomesPage').then((m) => ({ default: m.IncomesPage })),
)
const TransfersPage = lazy(() =>
  import('./pages/TransfersPage').then((m) => ({ default: m.TransfersPage })),
)
const BalancesPage = lazy(() =>
  import('./pages/BalancesPage').then((m) => ({ default: m.BalancesPage })),
)
const AccountDetailPage = lazy(() =>
  import('./pages/AccountDetailPage').then((m) => ({ default: m.AccountDetailPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const RecurringPage = lazy(() =>
  import('./pages/RecurringPage').then((m) => ({ default: m.RecurringPage })),
)
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const PersonalBudgetPage = lazy(() =>
  import('./pages/PersonalBudgetPage').then((m) => ({ default: m.PersonalBudgetPage })),
)
const ImportExportPage = lazy(() =>
  import('./pages/ImportExportPage').then((m) => ({ default: m.ImportExportPage })),
)
const QuickEntryPage = lazy(() =>
  import('./pages/QuickEntryPage').then((m) => ({ default: m.QuickEntryPage })),
)

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
        {/* Sayfa icindeki hata kabugu yikmasin: gezinme ayakta kalsin. */}
        <ErrorBoundary>
          <Suspense fallback={<div className="page-loading">Yükleniyor...</div>}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </RequireAuth>
  )
}

/**
 * Firestore abonelikleri yalnizca giris yapilmisken, ve rota
 * degisiminden BAGIMSIZ olarak bir kez kurulsun diye burada duruyor.
 *
 * DataProvider'i her sayfanin kabugunun icine koymak ise yaramaz:
 * rota degisince o agac sokulup yeniden kurulur ve abonelikler her
 * gecise yeniden acilir — yani tam kacinmak istedigimiz sey olurdu.
 */
function AuthenticatedData({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <>{children}</>
  return (
    <DataProvider>
      <WelcomeGreeting />
      {children}
    </DataProvider>
  )
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthenticatedData>
          <Routes>
            <Route path="/giris" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <Shell title="BudgetCBO" subtitle="Bu ayın özeti">
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
              path="/hesaplar/:accountId"
              element={
                <Shell title="Hesap Hareketleri" subtitle="Tüm giriş ve çıkışlar">
                  <AccountDetailPage />
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
                <Shell
                  title="Sabit Ödemeler"
                  subtitle="Kira, sigorta, abonelikler, Sperrkonto/KYK gibi düzenli gelirler"
                >
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
        </AuthenticatedData>
      </ToastProvider>
    </AuthProvider>
  )
}
