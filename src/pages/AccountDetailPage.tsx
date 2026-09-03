import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { computeAccountBalances } from '../domain/balances'
import {
  computeAccountLedger,
  computeSavingsBreakdown,
  type LedgerKind,
} from '../domain/accountLedger'
import { monthKeyOf } from '../domain/transactions'

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const KIND_LABEL: Record<LedgerKind, string> = {
  harcama: 'Harcama',
  gelir: 'Gelir',
  'transfer-giris': 'Transfer girişi',
  'transfer-cikis': 'Transfer çıkışı',
}

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { transfers, loading: transfersLoading } = useTransfers()
  const [month, setMonth] = useState('')

  const loading = settingsLoading || txLoading || incomesLoading || transfersLoading
  const account = settings.accounts.find((a) => a.id === accountId)

  const balance = useMemo(() => {
    if (!account) return undefined
    return computeAccountBalances(settings.accounts, transactions, incomes, transfers, settings).find(
      (b) => b.account.id === account.id,
    )
  }, [account, settings, transactions, incomes, transfers])

  const allRows = useMemo(
    () =>
      account
        ? computeAccountLedger(account.name, transactions, incomes, transfers, settings)
        : [],
    [account, transactions, incomes, transfers, settings],
  )

  const rows = useMemo(
    () => (month ? allRows.filter((r) => monthKeyOf(r.date) === month) : allRows),
    [allRows, month],
  )

  // Tasarruf hesaplarinda "bu paranin hangisi ne icin" kirilimi.
  const isSavings = Boolean(account && /tasarruf/i.test(account.name))
  const breakdown = useMemo(
    () =>
      account && isSavings
        ? computeSavingsBreakdown(account.name, transfers, settings, balance?.balanceEUR ?? 0)
        : undefined,
    [account, isSavings, transfers, settings, balance],
  )

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  if (!account || !balance) {
    return (
      <div className="stack">
        <p className="empty-note">Hesap bulunamadı.</p>
        <Link to="/hesaplar" className="btn">
          Hesap Bakiyeleri'ne dön
        </Link>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="hero-head">
          <span className="hero-month">{account.name}</span>
          <span className="hero-count">
            {account.currency} · {account.owner}
          </span>
        </div>
        <div className="hero-main">
          <span className="hero-label">Güncel bakiye</span>
          <span className="hero-amount">{fmt(balance.balanceEUR)} €</span>
        </div>
        <div className="hero-split">
          <div>
            <span className="hero-split-label">Gelir</span>
            <span className="hero-split-value">{fmt(balance.incomesEUR)} €</span>
          </div>
          <div>
            <span className="hero-split-label">Harcama</span>
            <span className="hero-split-value">{fmt(balance.expensesEUR)} €</span>
          </div>
          <div>
            <span className="hero-split-label">Transfer net</span>
            <span className="hero-split-value">
              {fmt(balance.transfersInEUR - balance.transfersOutEUR)} €
            </span>
          </div>
        </div>
      </section>

      {breakdown && (
        <section className="panel">
          <div className="panel-head">
            <h2>Bu para ne için?</h2>
            <Link to="/hedefler" className="panel-link">
              Hedefler
            </Link>
          </div>
          {breakdown.goals.length === 0 ? (
            <p className="empty-note">
              Bu hesaba henüz hedefe bağlı bir tasarruf transferi gelmemiş.
            </p>
          ) : (
            <ul className="goal-split-list">
              {breakdown.goals.map((g) => (
                <li key={g.goalName} className="goal-split">
                  <div className="goal-split-head">
                    <span className="goal-split-name">{g.goalName}</span>
                    <span className="goal-split-total">{fmt(g.totalEUR)} €</span>
                  </div>
                  <div className="goal-split-people">
                    {g.contributions.map((c) => (
                      <span key={c.person} className="goal-split-person">
                        {c.person}: {fmt(c.amountEUR)} €
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {Math.abs(breakdown.unassignedEUR) >= 0.01 && (
            <p className="chart-note">
              Hedefe atanmamış: <strong>{fmt(breakdown.unassignedEUR)} €</strong> (hedefe bağlı
              olmayan giriş/çıkışlardan kalan)
            </p>
          )}
        </section>
      )}

      <div className="expenses-list-header">
        <label>
          Ay
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        {month && (
          <button type="button" className="btn btn-quiet" onClick={() => setMonth('')}>
            Tüm zamanlar
          </button>
        )}
      </div>

      <p className="filters-result">
        {rows.length} hareket
        {month ? '' : ' · tüm zamanlar'}
      </p>

      {rows.length === 0 ? (
        <p className="expenses-empty">Bu hesapta hareket yok.</p>
      ) : (
        <ul className="ledger-list">
          {rows.map((r) => (
            <li key={r.id} className={r.amountEUR < 0 ? 'ledger-row ledger-row--out' : 'ledger-row'}>
              <span className="ledger-main">
                <span className="ledger-label">{r.label}</span>
                <span className="ledger-detail">
                  {r.date} · {KIND_LABEL[r.kind]}
                  {r.detail ? ` · ${r.detail}` : ''}
                </span>
              </span>
              <span className="ledger-amounts">
                <span
                  className={r.amountEUR < 0 ? 'ledger-amount is-out' : 'ledger-amount is-in'}
                >
                  {r.amountEUR > 0 ? '+' : ''}
                  {fmt(r.amountEUR)} €
                </span>
                <span className="ledger-running">{fmt(r.balanceAfterEUR)} €</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
