import { Link } from 'react-router-dom'
import type { PersonNetWorth } from '../domain/types'
import type { PersonScope } from '../domain/personSummary'
import { IconEye, IconEyeOff } from './icons'

function fmt(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Props = {
  netWorths: PersonNetWorth[]
  scope: PersonScope
  hidden: boolean
  onToggleHidden: () => void
}

/**
 * Ana Sayfa'daki "mal varligi" karti: kisinin kendi hesaplari + Ortak
 * Kasa'daki payi (bkz. src/domain/balances.ts computePersonNetWorth).
 * Tutarlar bir dugmeyle blur'lanip tekrar acilabilir (bkz.
 * src/hooks/useNetWorthHidden.ts) — halka acik bir ortamda telefon
 * ekrani gorunse bile rakamlar okunmasin diye.
 */
export function NetWorthPanel({ netWorths, scope, hidden, onToggleHidden }: Props) {
  const visible = scope === 'Ortak' ? netWorths : netWorths.filter((n) => n.person === scope)
  const householdTotalEUR =
    netWorths.reduce((sum, n) => sum + n.ownAccountsTotalEUR, 0) +
    (netWorths[0]?.ortakKasaShareEUR ?? 0) * 2

  return (
    <section className="panel networth-panel">
      <div className="panel-head">
        <h2>Mal Varlığı</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleHidden}
          aria-label={hidden ? 'Tutarları göster' : 'Tutarları gizle'}
          aria-pressed={hidden}
        >
          {hidden ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>

      <div className={hidden ? 'networth-amounts networth-amounts--hidden' : 'networth-amounts'}>
        {visible.map((n) => (
          <div key={n.person} className="networth-person">
            <div className="networth-person-head">
              <span className="networth-person-name">{n.person}</span>
              <span className="networth-person-total">{fmt(n.totalEUR)} €</span>
            </div>
            <ul className="networth-account-list">
              {n.ownAccounts.map((a) => (
                <li key={a.account.id}>
                  <Link to={`/hesaplar/${a.account.id}`}>{a.account.name}</Link>
                  <span>{fmt(a.balanceEUR)} €</span>
                </li>
              ))}
              <li className="networth-shared-row">
                <Link to="/hesaplar">Ortak Kasa payı</Link>
                <span>{fmt(n.ortakKasaShareEUR)} €</span>
              </li>
            </ul>
          </div>
        ))}

        {scope === 'Ortak' && (
          <div className="networth-household">
            <span>Hanede toplam</span>
            <span>{fmt(householdTotalEUR)} €</span>
          </div>
        )}
      </div>
    </section>
  )
}
