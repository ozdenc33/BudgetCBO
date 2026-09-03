import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { computeMonthSummary } from '../domain/dashboard'
import { computeTransaction, monthKeyOf } from '../domain/transactions'
import { RemindersBanner } from '../components/RemindersBanner'
import { IconChart, IconPlus, IconReceipt, IconRepeat, IconTarget, IconWallet } from '../components/icons'

function todayMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

const SHORTCUTS = [
  { to: '/pano', label: 'Ay Panosu', icon: <IconChart size={20} /> },
  { to: '/harcamalar', label: 'Harcamalar', icon: <IconReceipt size={20} /> },
  { to: '/hesaplar', label: 'Hesaplar', icon: <IconWallet size={20} /> },
  { to: '/sabit-giderler', label: 'Sabit Giderler', icon: <IconRepeat size={20} /> },
  { to: '/hedefler', label: 'Hedefler', icon: <IconTarget size={20} /> },
]

export function HomePage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { transfers, loading: transfersLoading } = useTransfers()

  const month = todayMonthKey()
  const loading = settingsLoading || txLoading || incomesLoading || transfersLoading

  const summary = useMemo(
    () => computeMonthSummary(month, transactions, incomes, transfers, settings),
    [month, transactions, incomes, transfers, settings],
  )

  const recent = useMemo(
    () =>
      transactions
        .map((t) => computeTransaction(t, settings))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [transactions, settings],
  )

  const monthCount = useMemo(
    () => transactions.filter((t) => monthKeyOf(t.date) === month).length,
    [transactions, month],
  )

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="stack home-stack">
      <RemindersBanner />

      <section className="hero-card">
        <div className="hero-head">
          <span className="hero-month">{monthLabel(month)}</span>
          <span className="hero-count">{monthCount} kayıt</span>
        </div>
        <div className="hero-main">
          <span className="hero-label">Bu ay harcama</span>
          <span className="hero-amount">{fmt(summary.totalExpenseEUR)} €</span>
        </div>
        <div className="hero-split">
          <div>
            <span className="hero-split-label">Gelir</span>
            <span className="hero-split-value">{fmt(summary.totalIncomeEUR)} €</span>
          </div>
          <div>
            <span className="hero-split-label">Net</span>
            <span
              className={
                summary.netEUR < 0 ? 'hero-split-value is-negative' : 'hero-split-value is-positive'
              }
            >
              {fmt(summary.netEUR)} €
            </span>
          </div>
          <div>
            <span className="hero-split-label">Tasarrufa</span>
            <span className="hero-split-value">{fmt(summary.savingsTransferredEUR)} €</span>
          </div>
        </div>
        <Link to="/hizli-giris" className="btn btn-primary btn-block">
          <IconPlus size={18} />
          Hızlı harcama girişi
        </Link>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Son kayıtlar</h2>
          <Link to="/harcamalar" className="panel-link">
            Tümü
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="empty-note">Henüz kayıt yok. Hızlı giriş ile başlayabilirsin.</p>
        ) : (
          <ul className="mini-list">
            {recent.map((t) => (
              <li key={t.id} className="mini-row">
                <span className="mini-row-main">
                  <span className="mini-row-title">{t.description || t.category}</span>
                  <span className="mini-row-sub">
                    {t.date} · {t.budgetType}
                  </span>
                </span>
                <span className="mini-row-amount">
                  {fmt(t.amountEUR)} €
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Kısayollar</h2>
        </div>
        <div className="shortcut-grid">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to} className="shortcut">
              <span className="shortcut-icon">{s.icon}</span>
              <span>{s.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
