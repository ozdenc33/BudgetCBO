import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { computeAccountBalances, netWorth } from '../domain/balances'
import { computeContributionSummary, contributionCheckEUR, contributionStatus } from '../domain/contributions'

function formatEUR(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BalancesPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { transfers, loading: transfersLoading } = useTransfers()

  const loading = settingsLoading || txLoading || incomesLoading || transfersLoading

  const balances = useMemo(
    () => computeAccountBalances(settings.accounts, transactions, incomes, transfers, settings),
    [settings, transactions, incomes, transfers],
  )

  const total = useMemo(() => netWorth(balances), [balances])

  const contributions = useMemo(
    () => computeContributionSummary(settings.accounts, transactions, incomes, transfers, settings),
    [settings, transactions, incomes, transfers],
  )
  const status = useMemo(() => contributionStatus(contributions), [contributions])
  const check = useMemo(() => contributionCheckEUR(contributions), [contributions])

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="balances-page">
      <header className="page-header">
        <Link to="/" className="back-link">
          ← Ana sayfa
        </Link>
        <h1>Hesap Bakiyeleri</h1>
      </header>

      <p className="balances-note">
        Tüm zamanların toplamı, EUR eşdeğer. Sperrkonto burada değil, aylık serbest tutar gelir
        olarak Girokonto bakiyesine eklenir.
      </p>

      <ul className="balances-list">
        {balances.map((b) => (
          <li key={b.account.id} className="balance-row">
            <div className="balance-row-main">
              <span className="balance-row-name">{b.account.name}</span>
              <span
                className={
                  b.balanceEUR < 0 ? 'balance-row-amount balance-row-amount--negative' : 'balance-row-amount'
                }
              >
                {formatEUR(b.balanceEUR)} €
              </span>
            </div>
            <div className="balance-row-meta">
              <span>{b.account.owner}</span>
              <span>Başlangıç {formatEUR(b.account.startingBalanceEUR)} €</span>
              <span>Gelir +{formatEUR(b.incomesEUR)} €</span>
              <span>Harcama -{formatEUR(b.expensesEUR)} €</span>
              <span>Transfer çıkış -{formatEUR(b.transfersOutEUR)} €</span>
              <span>Transfer giriş +{formatEUR(b.transfersInEUR)} €</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="balances-total">
        <span>Net varlık (toplam)</span>
        <span>{formatEUR(total)} €</span>
      </div>

      <section className="dashboard-section">
        <h2>Katkı Özeti (tüm zamanlar)</h2>
        <p className="settings-note">
          Fark bilgi amaçlıdır, borç takibi değildir. Eşitlemek isterseniz Transferler sayfasına Tip =
          Kişiden Kişiye olarak girin.
        </p>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Kişi</th>
                <th>Doğrudan ödediği</th>
                <th>Ortak Kasa'ya koyduğu</th>
                <th>Toplam katkı</th>
                <th>Kendi payı</th>
                <th>Fark</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c.person}>
                  <td style={{ textAlign: 'left' }}>{c.person}</td>
                  <td>{formatEUR(c.directlyPaidEUR)} €</td>
                  <td>{formatEUR(c.paidIntoSharedAccountEUR)} €</td>
                  <td>{formatEUR(c.totalContributionEUR)} €</td>
                  <td>{formatEUR(c.ownShareEUR)} €</td>
                  <td className={c.diffEUR < 0 ? 'cell-negative' : ''}>{formatEUR(c.diffEUR)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="settings-note">
          {status.balanced
            ? 'Toplamda eşit'
            : `Toplamda ${status.aheadPerson} ${formatEUR(status.amountEUR)} € önde`}
          {' · '}
          Kontrol (iki farkın toplamı sıfır olmalı): {formatEUR(check)} €
        </p>
      </section>
    </div>
  )
}
