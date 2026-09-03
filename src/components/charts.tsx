// Grafikler: harici kutuphane yok, inline SVG + CSS. Renkler CSS
// degiskenlerinden gelir (--chart-1 / --chart-2), boylece acik ve koyu
// temada dogru tonlar kullanilir. Her grafigin altinda ayni verinin
// tablosu zaten var; grafik veriyi "kapatmaz", yalnizca ozetler.

function fmtEUR(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1000) return (value / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'k'
  return value.toLocaleString('de-DE', { maximumFractionDigits: 0 })
}

/**
 * Yatay cubuk: tek seri (harcama), tek renk. Tek seri oldugu icin
 * lejant yok; deger her cubugun ucunda yaziyor. Uzun Turkce kategori
 * adlari sarabilsin diye SVG yerine HTML/CSS kullanildi (SVG metni
 * tasar veya kirpilirdi).
 */
export function CategoryBars({
  rows,
  max,
}: {
  rows: { key: string; label: string; value: number }[]
  max?: number
}) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 0)
  if (rows.length === 0 || top <= 0) return null

  return (
    <div className="bar-list">
      {rows.map((r) => (
        <div className="bar-row" key={r.key}>
          <span className="bar-row-label">{r.label}</span>
          <span className="bar-row-value">{fmtEUR(r.value)} €</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${Math.max((r.value / top) * 100, 1)}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  )
}

type ColumnRow = { key: string; label: string; a: number; b: number }

/**
 * Sutun yolu: veri ucu (ust) 4px yuvarlak, taban kare. Duz <rect rx="4">
 * tabani da yuvarlardi; spec tabanin kare kalmasini ister.
 */
function columnPath(x: number, yTop: number, w: number, yBase: number): string {
  const h = yBase - yTop
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return [
    `M ${x} ${yBase}`,
    `L ${x} ${yTop + r}`,
    `Q ${x} ${yTop} ${x + r} ${yTop}`,
    `L ${x + w - r} ${yTop}`,
    `Q ${x + w} ${yTop} ${x + w} ${yTop + r}`,
    `L ${x + w} ${yBase}`,
    'Z',
  ].join(' ')
}

/**
 * Net trend cizgisi: tek seri (gelir - harcama), sifir cizgisi vurgulu.
 * Tek seri oldugu icin lejant yok; son noktanin degeri dogrudan yazilir.
 */
export function NetTrend({ rows }: { rows: { key: string; label: string; net: number }[] }) {
  if (rows.length < 2) return null

  const W = 420
  const H = 160
  const ML = 42
  const MR = 10
  const MT = 14
  const MB = 26
  const plotW = W - ML - MR
  const plotH = H - MT - MB

  const values = rows.map((r) => r.net)
  const rawMax = Math.max(...values, 0)
  const rawMin = Math.min(...values, 0)
  const span = Math.max(rawMax - rawMin, 1)
  const pad = span * 0.12
  const top = rawMax + pad
  const bottom = rawMin - pad

  const x = (i: number) => ML + (plotW / Math.max(rows.length - 1, 1)) * i
  const y = (v: number) => MT + plotH - ((v - bottom) / (top - bottom)) * plotH

  const path = rows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(r.net)}`).join(' ')
  const last = rows[rows.length - 1]

  return (
    <div className="chart-block">
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Aylık net trend grafiği">
        {/* Sifir cizgisi: artiyi eksiden ayiran esik */}
        <line className="chart-axis" x1={ML} x2={W - MR} y1={y(0)} y2={y(0)} />
        <text className="chart-tick" x={ML - 8} y={y(0) + 4} textAnchor="end">
          0
        </text>

        <path className="chart-line" d={path} />

        {rows.map((r, i) => (
          <circle
            key={r.key}
            className={r.net < 0 ? 'chart-dot chart-dot--negative' : 'chart-dot'}
            cx={x(i)}
            cy={y(r.net)}
            r="4"
          >
            <title>{`${r.label}: ${fmtEUR(r.net)} €`}</title>
          </circle>
        ))}

        {/* Dogrudan etiket yalnizca son noktada */}
        <text
          className="chart-value"
          x={x(rows.length - 1)}
          y={y(last.net) + (last.net < 0 ? 16 : -10)}
          textAnchor="end"
        >
          {fmtAxis(last.net)}
        </text>

        {rows.map((r, i) => (
          <text key={r.key} className="chart-tick" x={x(i)} y={H - 8} textAnchor="middle">
            {r.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

/**
 * Gruplu sutun: iki seri (harcama ve gelir). Ikisi de EUR oldugu icin
 * tek eksen kullanilir (cift eksen yanilticidir). Lejant her zaman var;
 * dogrudan etiket yalnizca son ayda, kalabalik olmasin diye.
 */
export function MonthlyColumns({
  rows,
  labelA,
  labelB,
}: {
  rows: ColumnRow[]
  labelA: string
  labelB: string
}) {
  if (rows.length === 0) return null

  // viewBox mobil genislige yakin secildi: kucuk ekranda 1:1'e yakin
  // olcekleniyor, boylece eksen yazilari okunur kaliyor (CSS'te
  // max-width ile buyume de sinirli).
  const W = 420
  const H = 250
  const ML = 42
  const MR = 8
  const MT = 14
  const MB = 28
  const plotW = W - ML - MR
  const plotH = H - MT - MB

  const rawMax = Math.max(...rows.flatMap((r) => [r.a, r.b]), 0)
  if (rawMax <= 0) return null
  // Eksen adimi temiz bir sayiya yuvarlanir (500 / 1.000 gibi), boylece
  // etiketler "1,9k" degil "1k / 1,5k / 2k" seklinde okunur.
  const targetStep = rawMax / 4
  const mag = Math.pow(10, Math.floor(Math.log10(targetStep)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= targetStep) ?? 10 * mag
  const top = Math.ceil(rawMax / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)

  const band = plotW / rows.length
  // Cubuk kalinligi 24px'i asmaz; kalan bosluk hava olarak birakilir.
  const barW = Math.min(24, Math.max(6, band / 2 - 5))
  const GAP = 2 // komsu cubuklar arasinda yuzey boslugu
  const y = (v: number) => MT + plotH - (v / top) * plotH

  const lastKey = rows[rows.length - 1]?.key

  return (
    <div className="chart-block">
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-swatch chart-swatch--1" />
          {labelA}
        </span>
        <span className="chart-legend-item">
          <span className="chart-swatch chart-swatch--2" />
          {labelB}
        </span>
      </div>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${labelA} ve ${labelB} aylık gelişim grafiği`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={ML - 8} y={y(t) + 4} textAnchor="end">
              {fmtAxis(t)}
            </text>
          </g>
        ))}

        {rows.map((r, i) => {
          const cx = ML + band * i + band / 2
          const xA = cx - barW - GAP / 2
          const xB = cx + GAP / 2
          const isLast = r.key === lastKey
          return (
            <g key={r.key}>
              <path className="chart-bar chart-bar--1" d={columnPath(xA, y(r.a), barW, y(0))}>
                <title>{`${r.label} · ${labelA}: ${fmtEUR(r.a)} €`}</title>
              </path>
              <path className="chart-bar chart-bar--2" d={columnPath(xB, y(r.b), barW, y(0))}>
                <title>{`${r.label} · ${labelB}: ${fmtEUR(r.b)} €`}</title>
              </path>
              {/* Dogrudan etiket yalnizca son (guncel) ayda */}
              {isLast && r.a > 0 && (
                <text className="chart-value" x={xA + barW / 2} y={y(r.a) - 6} textAnchor="middle">
                  {fmtAxis(r.a)}
                </text>
              )}
              <text className="chart-tick" x={cx} y={H - 10} textAnchor="middle">
                {r.label}
              </text>
            </g>
          )
        })}

        {/* Taban cizgisi */}
        <line className="chart-axis" x1={ML} x2={W - MR} y1={y(0)} y2={y(0)} />
      </svg>
    </div>
  )
}
