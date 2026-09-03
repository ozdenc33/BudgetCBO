import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { computeBudgetTypeSummary } from '../domain/dashboard'
import { computeBudgetAlerts, findNegativeBalances } from '../domain/budgetAlerts'
import { computeAccountBalances } from '../domain/balances'
import { computeScopeSummary, computeWeekSummary, type PersonScope } from '../domain/personSummary'
import { computeTransaction } from '../domain/transactions'
import { personForEmail } from '../lib/currentPerson'
import { useAuth } from '../auth/AuthContext'
import { RemindersBanner } from '../components/RemindersBanner'
import {
  IconChart,
  IconPlus,
  IconReceipt,
  IconRepeat,
  IconTarget,
  IconWallet,
} from '../components/icons'

const SCOPES: PersonScope[] = ['Ortak', 'Can', 'Tuğçe']

// Ana sayfa uyari duvarina donmesin: fazlasi tek satirda ozetlenir.
const MAX_ALERTS = 3

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

function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MONTH_NAMES[Number(m) - 1].slice(0, 3)}`
}

const SHORTCUTS = [
  { to: '/hesaplar', label: 'Hesaplar', icon: <IconWallet size={20} /> },
  { to: '/pano', label: 'Ay Panosu', icon: <IconChart size={20} /> },
  { to: '/harcamalar', label: 'Harcamalar', icon: <IconReceipt size={20} /> },
  { to: '/sabit-giderler', label: 'Sabit Giderler', icon: <IconRepeat size={20} /> },
  { to: '/hedefler', label: 'Hedefler', icon: <IconTarget size={20} /> },
]

export function HomePage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { transfers, loading: transfersLoading } = useTransfers()
  const { user } = useAuth()

  // Varsayilan kapsam: giris yapan kisi kendi ozetini gorur, yoksa Ortak.
  const [scope, setScope] = useState<PersonScope>(() => personForEmail(user?.email) ?? 'Ortak')

  const month = todayMonthKey()
  const loading = settingsLoading || txLoading || incomesLoading || transfersLoading
  const today = useMemo(() => new Date(), [])

  const summary = useMemo(
    () => computeScopeSummary(scope, month, transactions, incomes, transfers, settings),
    [scope, month, transactions, incomes, transfers, settings],
  )

  const week = useMemo(
    () => computeWeekSummary(scope, transactions, settings, today),
    [scope, transactions, settings, today],
  )

  // Limit uyarilari ev halkinin ortak bilgisidir: kapsam Can/Tuğçe
  // secili olsa da gosterilir (simulasyonda Can kapsaminda giris yapinca
  // ortak limit uyarilarini hic gormedigimiz icin degistirildi).
  const alerts = useMemo(
    () => computeBudgetAlerts(computeBudgetTypeSummary(month, transactions, settings)),
    [month, transactions, settings],
  )

  // Eksiye dusen hesaplar (ozellikle Ortak Kasa: katkilar harcamayi
  // karsilamiyorsa burada gorunur).
  const negativeBalances = useMemo(
    () =>
      findNegativeBalances(
        computeAccountBalances(settings.accounts, transactions, incomes, transfers, settings),
      ),
    [settings, transactions, incomes, transfers],
  )

  const recent = useMemo(() => {
    const computed = transactions.map((t) => computeTransaction(t, settings))
    const inScope =
      scope === 'Ortak'
        ? computed
        : computed.filter((t) => ((scope === 'Can' ? t.canShare : t.tugceShare) ?? 0) > 0)
    return inScope.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  }, [transactions, settings, scope])

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  const weekDiff = week.expenseEUR - week.previousExpenseEUR

  return (
    <div className="stack home-stack">
      <div className="scope-toggle" role="tablist" aria-label="Özet kapsamı">
        {SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === scope}
            className={s === scope ? 'scope-btn scope-btn--active' : 'scope-btn'}
            onClick={() => setScope(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <section className="hero-card">
        <div className="hero-head">
          <span className="hero-month">
            {monthLabel(month)}
            {scope !== 'Ortak' && ` · ${scope}`}
          </span>
          <span className="hero-count">{summary.transactionCount} kayıt</span>
        </div>
        <div className="hero-main">
          <span className="hero-label">
            {scope === 'Ortak' ? 'Bu ay harcama' : `Bu ay ${scope} payı`}
          </span>
          <span className="hero-amount">{fmt(summary.expenseEUR)} €</span>
        </div>
        <div className="hero-split">
          <div>
            <span className="hero-split-label">Gelir</span>
            <span className="hero-split-value">{fmt(summary.incomeEUR)} €</span>
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
            <span className="hero-split-value">{fmt(summary.savingsEUR)} €</span>
          </div>
        </div>
        <Link to="/hizli-giris" className="btn btn-primary btn-block">
          <IconPlus size={18} />
          Hızlı harcama girişi
        </Link>
      </section>

      <RemindersBanner />

      {(alerts.length > 0 || negativeBalances.length > 0) && (
        <div className="alert-list">
          {negativeBalances.map((b) => (
            <Link key={b.account.id} to="/hesaplar" className="alert-card alert-card--danger">
              <span>
                <strong>{b.account.name}</strong> bakiyesi eksiye düştü
              </span>
              <span className="alert-pct">{fmt(b.balanceEUR)} €</span>
            </Link>
          ))}
          {alerts.slice(0, MAX_ALERTS).map((a) => (
            <Link key={a.budgetType} to="/pano" className="alert-card">
              <span>
                <strong>{a.budgetType}</strong>{' '}
                {a.level === 'asildi'
                  ? `limiti ${fmt(a.deltaEUR)} € aşıldı`
                  : `limitine yaklaşıldı, ${fmt(a.deltaEUR)} € kaldı`}
              </span>
              <span className="alert-pct">
                {(a.usagePct * 100).toLocaleString('de-DE', { maximumFractionDigits: 0 })}%
              </span>
            </Link>
          ))}
        </div>
      )}


      <section className="panel">
        <div className="panel-head">
          <h2>Bu hafta</h2>
          <span className="panel-note">
            {dayLabel(week.fromISO)} – {dayLabel(week.toISO)}
          </span>
        </div>
        <div className="week-row">
          <span className="week-amount">{fmt(week.expenseEUR)} €</span>
          <span
            className={
              weekDiff > 0 ? 'week-delta week-delta--up' : 'week-delta week-delta--down'
            }
          >
            {weekDiff === 0
              ? 'geçen haftayla aynı'
              : `${weekDiff > 0 ? '+' : ''}${fmt(weekDiff)} € geçen haftaya göre`}
          </span>
        </div>
        <p className="empty-note">
          {week.transactionCount} kayıt · geçen hafta {fmt(week.previousExpenseEUR)} €
        </p>
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
                  {fmt(
                    scope === 'Ortak'
                      ? t.amountEUR
                      : (scope === 'Can' ? t.canShare : t.tugceShare) ?? 0,
                  )}{' '}
                  €
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
