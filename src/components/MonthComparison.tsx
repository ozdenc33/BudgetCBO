import type { MonthComparison, MonthDelta } from '../domain/monthComparison'

// Ay kapanisi ozeti: secili ay bir onceki aya gore nasil gecti.
// Hesaplama src/domain/monthComparison.ts icinde; burasi yalnizca
// gosterim.

const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES[month - 1] ?? monthKey} ${year}`
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDelta(delta: MonthDelta): string {
  const sign = delta.deltaEUR > 0 ? '+' : ''
  const pct =
    delta.deltaPct == null
      ? ''
      : ` (${delta.deltaPct > 0 ? '+' : ''}${(delta.deltaPct * 100).toLocaleString('de-DE', {
          maximumFractionDigits: 0,
        })}%)`
  return `${sign}${fmt(delta.deltaEUR)} €${pct}`
}

/**
 * Harcamada ARTIS kotudur, gelir ve tasarrufta ARTIS iyidir; renk buna
 * gore secilir. `neutral` degisim yoksa kullanilir.
 */
function toneClass(delta: MonthDelta, increaseIsGood: boolean): string {
  if (delta.deltaEUR === 0) return 'compare-delta'
  const good = increaseIsGood ? delta.deltaEUR > 0 : delta.deltaEUR < 0
  return good ? 'compare-delta compare-delta--good' : 'compare-delta compare-delta--bad'
}

function Row({
  label,
  delta,
  increaseIsGood,
}: {
  label: string
  delta: MonthDelta
  increaseIsGood: boolean
}) {
  return (
    <div className="compare-tile">
      <span className="compare-label">{label}</span>
      <span className="compare-value">{fmt(delta.currentEUR)} €</span>
      <span className={toneClass(delta, increaseIsGood)}>
        {delta.deltaEUR === 0 ? 'geçen ayla aynı' : fmtDelta(delta)}
      </span>
    </div>
  )
}

export function MonthComparisonSection({ comparison }: { comparison: MonthComparison }) {
  const hasPrevious =
    comparison.previous.totalExpenseEUR > 0 || comparison.previous.totalIncomeEUR > 0

  return (
    <section className="dashboard-section">
      <h2>Ay Kapanışı</h2>
      <p className="settings-note">
        {monthLabel(comparison.monthKey)}, {monthLabel(comparison.previousMonthKey)} ayına göre.
      </p>

      {!hasPrevious ? (
        <p className="empty-note">
          {monthLabel(comparison.previousMonthKey)} ayında karşılaştırılacak kayıt yok.
        </p>
      ) : (
        <>
          <div className="compare-grid">
            <Row label="Harcama" delta={comparison.expense} increaseIsGood={false} />
            <Row label="Gelir" delta={comparison.income} increaseIsGood />
            <Row label="Tasarrufa aktarılan" delta={comparison.savings} increaseIsGood />
            <Row label="Net" delta={comparison.net} increaseIsGood />
          </div>

          {(comparison.biggestIncreases.length > 0 || comparison.biggestDecreases.length > 0) && (
            <div className="compare-movers">
              {comparison.biggestIncreases.length > 0 && (
                <div>
                  <h3 className="compare-movers-title">En çok artan</h3>
                  <ul className="mini-list">
                    {comparison.biggestIncreases.map((d) => (
                      <li key={d.category} className="mini-row">
                        <span className="mini-row-title">{d.category}</span>
                        <span className="compare-delta compare-delta--bad">{fmtDelta(d)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {comparison.biggestDecreases.length > 0 && (
                <div>
                  <h3 className="compare-movers-title">En çok azalan</h3>
                  <ul className="mini-list">
                    {comparison.biggestDecreases.map((d) => (
                      <li key={d.category} className="mini-row">
                        <span className="mini-row-title">{d.category}</span>
                        <span className="compare-delta compare-delta--good">{fmtDelta(d)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
