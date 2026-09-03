import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useRecurring } from '../hooks/useRecurring'
import { computeReminders } from '../domain/reminders'

const MAX_VISIBLE = 2

export function RemindersBanner() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { items: recurring, loading: recurringLoading } = useRecurring()

  const today = useMemo(() => new Date(), [])
  const loading = settingsLoading || txLoading || recurringLoading

  const reminders = useMemo(
    () => (loading ? undefined : computeReminders(recurring, transactions, settings, today)),
    [loading, recurring, transactions, settings, today],
  )

  if (!reminders || (reminders.upcoming.length === 0 && reminders.unconfirmedNearMonthEnd.length === 0)) {
    return null
  }

  return (
    <div className="reminders-banner">
      {reminders.unconfirmedNearMonthEnd.length > 0 && (
        <Link to="/sabit-giderler" className="reminder-card">
          <span>
            <span className="reminder-card-title">Ay sonu yaklaşıyor: </span>
            {reminders.unconfirmedNearMonthEnd.length} sabit gider bu ay hâlâ onaylanmadı
          </span>
          <span>→</span>
        </Link>
      )}
      {/* Ana sayfa uyari yiginina donusmesin diye en yakin 2 odeme
          gosterilir; kalanlar tek satirda ozetlenir. */}
      {reminders.upcoming.slice(0, MAX_VISIBLE).map((r) => (
        <Link to="/sabit-giderler" className="reminder-card" key={r.id}>
          <span>
            <span className="reminder-card-title">{r.name}: </span>
            {r.remainingDays === 0 ? 'bugün' : `${r.remainingDays} gün içinde`} ödeme günü
          </span>
          <span>→</span>
        </Link>
      ))}
      {reminders.upcoming.length > MAX_VISIBLE && (
        <Link to="/sabit-giderler" className="reminder-more">
          +{reminders.upcoming.length - MAX_VISIBLE} yaklaşan ödeme daha
        </Link>
      )}
    </div>
  )
}
