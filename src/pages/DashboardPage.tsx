import { useMemo, useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import {
  BUDGET_TYPES_ORDER,
  computeBudgetTypeSummary,
  computeCategoryBreakdown,
  computeControls,
  computeMonthSummary,
  computeMonthlyProgress,
} from '../domain/dashboard'
import { CategoryBars, MonthlyColumns, NetTrend } from '../components/charts'
import { summarizeFutureDated } from '../domain/futureDated'
import { computeTransaction, monthKeyOf } from '../domain/transactions'

function todayMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(value: number | undefined): string {
  if (value == null) return '—'
  return (value * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + '%'
}

export function DashboardPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { transfers, loading: transfersLoading } = useTransfers()
  const [month, setMonth] = useState(todayMonthKey)
  const today = useMemo(() => new Date(), [])

  const loading = settingsLoading || txLoading || incomesLoading || transfersLoading

  const summary = useMemo(
    () => computeMonthSummary(month, transactions, incomes, transfers, settings),
    [month, transactions, incomes, transfers, settings],
  )
  const budgetRows = useMemo(
    () => computeBudgetTypeSummary(month, transactions, settings),
    [month, transactions, settings],
  )
  const categoryRows = useMemo(
    () => computeCategoryBreakdown(month, transactions, settings),
    [month, transactions, settings],
  )
  const controls = useMemo(
    () => computeControls(settings.accounts, transactions, incomes, transfers, settings),
    [settings, transactions, incomes, transfers],
  )
  const progress = useMemo(
    () => computeMonthlyProgress(transactions, incomes, settings),
    [transactions, incomes, settings],
  )

  // Ileri tarihli kayitlar toplamdan cikarilmaz (Excel'de de cikarilmaz),
  // ama kullanici toplamin icinde henuz cikmamis para oldugunu bilsin.
  const future = useMemo(() => {
    const monthTx = transactions
      .map((t) => computeTransaction(t, settings))
      .filter((t) => monthKeyOf(t.date) === month)
    return summarizeFutureDated(monthTx, today)
  }, [transactions, settings, month, today])

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="dashboard-page">
      <div className="expenses-list-header">
        <label>
          Ay
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button type="button" className="btn btn-quiet no-print" onClick={() => window.print()}>
          PDF / Yazdır
        </button>
      </div>

      <p className="print-only print-title">Ortak Bütçe — Ay Panosu · {month}</p>

      <section className="dashboard-section">
        <h2>Ay Özeti</h2>
        <div className="summary-grid">
          <div className="summary-tile">
            <span className="summary-label">Toplam gelir</span>
            <span className="summary-value">{fmt(summary.totalIncomeEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Toplam harcama</span>
            <span className="summary-value">{fmt(summary.totalExpenseEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Tasarrufa aktarılan</span>
            <span className="summary-value">{fmt(summary.savingsTransferredEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Net</span>
            <span
              className={
                summary.netEUR < 0
                  ? 'summary-value summary-value--negative'
                  : 'summary-value summary-value--positive'
              }
            >
              {fmt(summary.netEUR)} €
            </span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Taşınma harici harcama</span>
            <span className="summary-value">{fmt(summary.nonMovingExpenseEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Tasarruf oranı</span>
            <span className="summary-value">{fmtPct(summary.savingsRatePct)}</span>
          </div>
        </div>
        {future.count > 0 && (
          <p className="chart-note">
            Bu toplamın {fmt(future.totalEUR)} €'su ({future.count} kayıt) ileri tarihli, henüz
            hesaptan çıkmadı.
          </p>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Bütçe Tipi Bazında</h2>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Bütçe Tipi</th>
                <th>Harcama</th>
                <th>Limit</th>
                <th>Kalan</th>
                <th>Kullanım</th>
                <th>Önceki Ay</th>
                <th>Pay</th>
              </tr>
            </thead>
            <tbody>
              {budgetRows.map((r) => (
                <tr key={r.budgetType}>
                  <td>{r.budgetType}</td>
                  <td>{fmt(r.spentEUR)} €</td>
                  <td>{r.limitEUR === 0 ? '—' : fmt(r.limitEUR) + ' €'}</td>
                  <td className={r.remainingEUR < 0 && r.limitEUR > 0 ? 'cell-negative' : ''}>
                    {r.limitEUR === 0 ? '—' : fmt(r.remainingEUR) + ' €'}
                  </td>
                  <td className={(r.usagePct ?? 0) > 1 ? 'cell-negative' : ''}>
                    {fmtPct(r.usagePct)}
                  </td>
                  <td>{fmt(r.previousSpentEUR)} €</td>
                  <td>{fmtPct(r.sharePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Kategori Kırılımı</h2>
        {categoryRows.length === 0 ? (
          <p className="expenses-empty">Bu ayda henüz harcama yok.</p>
        ) : (
          <>
          <CategoryBars
            rows={categoryRows.slice(0, 8).map((r) => ({
              key: r.category.id,
              label: r.category.name,
              value: r.spentEUR,
            }))}
          />
          {categoryRows.length > 8 && (
            <p className="chart-note">Grafikte en yüksek 8 kategori var; tamamı aşağıdaki tabloda.</p>
          )}
          <div className="table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Harcama</th>
                  <th>Pay</th>
                  <th>Önceki Ay</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((r) => (
                  <tr key={r.category.id}>
                    <td>{r.category.name}</td>
                    <td>{fmt(r.spentEUR)} €</td>
                    <td>{fmtPct(r.sharePct)}</td>
                    <td>{fmt(r.previousSpentEUR)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Kontroller</h2>
        <ul className="controls-list">
          {controls.map((c) => (
            <li key={c.label} className="control-row">
              <span>{c.label}</span>
              <span className={c.ok ? 'control-badge control-badge--ok' : 'control-badge'}>
                {c.ok ? 'OK' : c.message}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-section">
        <h2>Aylık Gelişim</h2>
        {progress.length === 0 ? (
          <p className="expenses-empty">Henüz veri yok.</p>
        ) : (
          <>
          <MonthlyColumns
            labelA="Harcama"
            labelB="Gelir"
            rows={progress.slice(-12).map((row) => ({
              key: row.monthKey,
              label: row.monthKey.slice(5) + '.' + row.monthKey.slice(2, 4),
              a: row.totalEUR,
              b: row.incomeEUR,
            }))}
          />
          <p className="chart-note">Net (gelir − harcama) trendi</p>
          <NetTrend
            rows={progress.slice(-12).map((row) => ({
              key: row.monthKey,
              label: row.monthKey.slice(5) + '.' + row.monthKey.slice(2, 4),
              net: row.netEUR,
            }))}
          />
          <div className="table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Ay</th>
                  {BUDGET_TYPES_ORDER.map((bt) => (
                    <th key={bt}>{bt}</th>
                  ))}
                  <th>Toplam</th>
                  <th>Gelir</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((row) => (
                  <tr key={row.monthKey} className={row.monthKey === month ? 'row-current' : ''}>
                    <td>{row.monthKey}</td>
                    {BUDGET_TYPES_ORDER.map((bt) => (
                      <td key={bt}>{fmt(row.byBudgetType[bt])}</td>
                    ))}
                    <td>{fmt(row.totalEUR)}</td>
                    <td>{fmt(row.incomeEUR)}</td>
                    <td className={row.netEUR < 0 ? 'cell-negative' : ''}>{fmt(row.netEUR)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  )
}
