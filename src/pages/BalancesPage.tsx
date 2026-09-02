import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { computeAccountBalances, netWorth } from '../domain/balances'

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
    </div>
  )
}
