import { useState } from 'react'
import type { BudgetType, Settings } from '../domain/types'
import { BUDGET_TYPES_ORDER } from '../domain/dashboard'
import type { TransactionFilter } from '../domain/filters'

type Props = {
  filter: TransactionFilter
  onChange: (next: TransactionFilter) => void
  settings: Settings
  /** Filtre uygulandiktan sonraki kayit sayisi ve toplami. */
  resultCount: number
  resultTotalEUR: number
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TransactionFilters({
  filter,
  onChange,
  settings,
  resultCount,
  resultTotalEUR,
}: Props) {
  const [open, setOpen] = useState(false)

  // Ay disindaki filtrelerden kac tanesi aktif (rozette gosterilir).
  const activeCount = [
    filter.category,
    filter.account,
    filter.budgetType,
    filter.minAmountEUR != null ? '1' : '',
    filter.maxAmountEUR != null ? '1' : '',
  ].filter(Boolean).length

  function clearAll() {
    onChange({ monthKey: filter.monthKey })
  }

  return (
    <div className="filters">
      <div className="filters-top">
        <input
          className="filters-search"
          type="search"
          inputMode="search"
          placeholder="Ara: açıklama, kategori, hesap…"
          value={filter.text ?? ''}
          onChange={(e) => onChange({ ...filter, text: e.target.value })}
        />
        <button
          type="button"
          className={activeCount > 0 ? 'filters-toggle filters-toggle--active' : 'filters-toggle'}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Filtre{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
      </div>

      {open && (
        <div className="filters-panel">
          <label>
            Ay
            <input
              type="month"
              value={filter.monthKey ?? ''}
              onChange={(e) => onChange({ ...filter, monthKey: e.target.value || undefined })}
            />
          </label>
          <label>
            Kategori
            <select
              value={filter.category ?? ''}
              onChange={(e) => onChange({ ...filter, category: e.target.value || undefined })}
            >
              <option value="">Hepsi</option>
              {settings.categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hesap
            <select
              value={filter.account ?? ''}
              onChange={(e) => onChange({ ...filter, account: e.target.value || undefined })}
            >
              <option value="">Hepsi</option>
              {settings.accounts.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bütçe tipi
            <select
              value={filter.budgetType ?? ''}
              onChange={(e) =>
                onChange({ ...filter, budgetType: (e.target.value as BudgetType) || undefined })
              }
            >
              <option value="">Hepsi</option>
              {BUDGET_TYPES_ORDER.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </label>
          <div className="filters-range">
            <label>
              En az €
              <input
                type="number"
                step="0.01"
                min="0"
                value={filter.minAmountEUR ?? ''}
                onChange={(e) =>
                  onChange({
                    ...filter,
                    minAmountEUR: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              En çok €
              <input
                type="number"
                step="0.01"
                min="0"
                value={filter.maxAmountEUR ?? ''}
                onChange={(e) =>
                  onChange({
                    ...filter,
                    maxAmountEUR: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <button type="button" className="filters-clear" onClick={clearAll}>
            Filtreleri temizle
          </button>
        </div>
      )}

      <p className="filters-result">
        {resultCount} kayıt · {fmt(resultTotalEUR)} €
      </p>
    </div>
  )
}
