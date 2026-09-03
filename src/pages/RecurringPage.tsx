import { useMemo, useState, type FormEvent } from 'react'
import { useToday } from '../hooks/useToday'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useRecurring } from '../hooks/useRecurring'
import { useRecurringSkips } from '../hooks/useRecurringSkips'
import { addRecurring, deleteRecurring, updateRecurring } from '../lib/firestoreRecurring'
import { skipRecurringForMonth, unskipRecurringForMonth } from '../lib/firestoreRecurringSkips'
import { addTransaction } from '../lib/firestoreTransactions'
import { computeRecurringItems, draftTransactionsForMonth } from '../domain/recurring'
import { BUDGET_TYPES_ORDER } from '../domain/dashboard'
import { todayMonthKey } from '../domain/dates'
import { useWrite } from '../hooks/useWrite'
import { MIKE_THANKS_NOTE, isMikeExpense } from '../domain/personalNotes'
import { useToast } from '../components/ToastProvider'
import type {
  BudgetType,
  FrequencyMonths,
  RecurringItem,
  RecurringItemDraft,
} from '../domain/types'

const FREQUENCIES: { value: FrequencyMonths; label: string }[] = [
  { value: 1, label: 'Her ay' },
  { value: 3, label: '3 ayda bir' },
  { value: 6, label: '6 ayda bir' },
  { value: 12, label: 'Yılda bir' },
]

const STATUS_LABEL: Record<string, string> = {
  pasif: 'Pasif',
  'tarih-sıklık-eksik': 'Tarih/sıklık girin',
  'vadesi-degil': '—',
  girildi: 'Girildi',
  eksik: 'EKSIK',
}

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type FormState = {
  name: string
  budgetType: BudgetType
  category: string
  amount: string
  frequencyMonths: FrequencyMonths
  account: string
  firstPaymentDate: string
  active: boolean
  note: string
}

function emptyForm(): FormState {
  return {
    name: '',
    budgetType: 'Ortak-Ev',
    category: '',
    amount: '',
    frequencyMonths: 1,
    account: '',
    firstPaymentDate: todayMonthKey() + '-01',
    active: true,
    note: '',
  }
}

function formToDraft(form: FormState): RecurringItemDraft {
  const draft: RecurringItemDraft = {
    name: form.name.trim(),
    budgetType: form.budgetType,
    category: form.category,
    frequencyMonths: form.frequencyMonths,
    account: form.account,
    firstPaymentDate: form.firstPaymentDate,
    active: form.active,
  }
  if (form.amount !== '') draft.amount = Number(form.amount)
  if (form.note.trim()) draft.note = form.note.trim()
  return draft
}

function itemToForm(item: RecurringItem): FormState {
  return {
    name: item.name,
    budgetType: item.budgetType,
    category: item.category,
    amount: item.amount != null ? String(item.amount) : '',
    frequencyMonths: item.frequencyMonths,
    account: item.account,
    firstPaymentDate: item.firstPaymentDate,
    active: item.active,
    note: item.note ?? '',
  }
}

export function RecurringPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { items, loading: itemsLoading } = useRecurring()
  const { skips, loading: skipsLoading } = useRecurringSkips()
  const [month, setMonth] = useState(todayMonthKey)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({})

  const loading = settingsLoading || txLoading || itemsLoading || skipsLoading
  const today = useToday()
  const runWrite = useWrite()
  const { showToast } = useToast()

  const computedItems = useMemo(
    () => computeRecurringItems(items, month, transactions, settings, today),
    [items, month, transactions, settings, today],
  )

  const skippedIds = useMemo(
    () => new Set(skips.filter((s) => s.monthKey === month).map((s) => s.recurringId)),
    [skips, month],
  )

  const drafts = useMemo(
    () => draftTransactionsForMonth(items, month, transactions, settings, today, skippedIds),
    [items, month, transactions, settings, today, skippedIds],
  )

  async function handleConfirm(
    itemId: string,
    defaultAmount: number,
    draft: ReturnType<typeof draftTransactionsForMonth>[number]['draft'],
  ) {
    const raw = draftAmounts[itemId]
    const amount = raw !== undefined && raw !== '' ? Number(raw) : defaultAmount
    const ok = await runWrite(addTransaction({ ...draft, amount }), {
      failureMessage: 'Sabit gider kaydedilemedi',
    })
    // Sabit gider de Mike'in butcesine girebilir (ornegin duzenli mama
    // siparisi); tesekkur notu orada da ciksin.
    if (ok && isMikeExpense(draft, settings)) {
      showToast({ message: MIKE_THANKS_NOTE, tone: 'fun', durationMs: 5000, key: 'mike-thanks' })
    }
  }

  async function handleSkip(itemId: string) {
    await runWrite(skipRecurringForMonth(itemId, month), {
      failureMessage: 'Bu ay atlanamadı',
    })
  }

  async function handleUnskip(itemId: string) {
    await runWrite(unskipRecurringForMonth(itemId, month), {
      failureMessage: 'Atlama geri alınamadı',
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const draft = formToDraft(form)
    const ok = editingId
      ? await runWrite(updateRecurring(editingId, draft), {
          failureMessage: 'Sabit gider güncellenemedi',
        })
      : await runWrite(addRecurring(draft), { failureMessage: 'Sabit gider eklenemedi' })
    if (!ok) return
    setForm(emptyForm())
    setEditingId(null)
  }

  function startEdit(item: RecurringItem) {
    setEditingId(item.id)
    setFormOpen(true)
    setForm(itemToForm(item))
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu sabit gideri silmek istediğinize emin misiniz?')) return
    await runWrite(deleteRecurring(id), { failureMessage: 'Sabit gider silinemedi' })
  }

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  const skippedActiveItems = computedItems.filter((c) => skippedIds.has(c.id))

  return (
    <div className="recurring-page">
      <div className="expenses-list-header">
        <label>
          Ay
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
      </div>

      {drafts.length > 0 && (
        <section className="dashboard-section">
          <h2>Taslak İşlemler ({drafts.length})</h2>
          <ul className="draft-list">
            {drafts.map(({ item, draft }) => (
              <li key={item.id} className="draft-row">
                <div className="draft-row-main">
                  <span className="draft-row-name">{item.name}</span>
                  <span className="draft-row-meta">
                    {item.category} · {item.account} · {draft.date}
                  </span>
                </div>
                <div className="draft-row-actions">
                  <input
                    type="number"
                    step="0.01"
                    placeholder={item.amount != null ? String(item.amount) : 'Tutar'}
                    value={
                      draftAmounts[item.id] ?? (item.amount != null ? String(item.amount) : '')
                    }
                    onChange={(e) =>
                      setDraftAmounts({ ...draftAmounts, [item.id]: e.target.value })
                    }
                  />
                  <button onClick={() => handleConfirm(item.id, item.amount ?? 0, draft)}>
                    Onayla
                  </button>
                  <button onClick={() => handleSkip(item.id)}>Atla</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {skippedActiveItems.length > 0 && (
        <section className="dashboard-section">
          <h2>Bu Ay Atlananlar</h2>
          <ul className="draft-list">
            {skippedActiveItems.map((item) => (
              <li key={item.id} className="draft-row">
                <div className="draft-row-main">
                  <span className="draft-row-name">{item.name}</span>
                </div>
                <div className="draft-row-actions">
                  <button onClick={() => handleUnskip(item.id)}>Geri al</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Sabit Gider Listesi</h2>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Kalem</th>
                <th>Bütçe</th>
                <th>Kategori</th>
                <th>Tutar</th>
                <th>Sıklık</th>
                <th>Hesap</th>
                <th>Sonraki Ödeme</th>
                <th>Kalan Gün</th>
                <th>Seçili Ay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {computedItems.map((c) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'left' }}>{c.name}</td>
                  <td>{c.budgetType}</td>
                  <td>{c.category}</td>
                  <td>{c.amount != null ? fmt(c.amount) + ' €' : '—'}</td>
                  <td>{FREQUENCIES.find((f) => f.value === c.frequencyMonths)?.label}</td>
                  <td>{c.account}</td>
                  <td>{c.nextPaymentDate ?? '—'}</td>
                  <td>{c.remainingDays ?? '—'}</td>
                  <td className={c.monthStatus === 'eksik' ? 'cell-negative' : ''}>
                    {STATUS_LABEL[c.monthStatus]}
                  </td>
                  <td>
                    <div className="expense-row-actions">
                      <button onClick={() => startEdit(c)}>Düzenle</button>
                      <button onClick={() => handleDelete(c.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details
        className="form-details"
        open={formOpen}
        onToggle={(e) => setFormOpen(e.currentTarget.open)}
      >
        <summary className="form-summary">
          {editingId ? 'Sabit gideri düzenle' : '+ Yeni sabit gider'}
        </summary>
        <form className="expense-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Sabit Gideri Düzenle' : 'Yeni Sabit Gider'}</h2>
          <label>
            Kalem
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Bütçe
            <select
              value={form.budgetType}
              onChange={(e) => setForm({ ...form, budgetType: e.target.value as BudgetType })}
            >
              {BUDGET_TYPES_ORDER.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kategori
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              <option value="" disabled>
                Seçin
              </option>
              {settings.categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tutar (EUR, opsiyonel)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label>
            Sıklık
            <select
              value={form.frequencyMonths}
              onChange={(e) =>
                setForm({ ...form, frequencyMonths: Number(e.target.value) as FrequencyMonths })
              }
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hesap (plan)
            <select
              value={form.account}
              onChange={(e) => setForm({ ...form, account: e.target.value })}
              required
            >
              <option value="" disabled>
                Seçin
              </option>
              {settings.accounts.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            İlk Ödeme Tarihi
            <input
              type="date"
              value={form.firstPaymentDate}
              onChange={(e) => setForm({ ...form, firstPaymentDate: e.target.value })}
              required
            />
          </label>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Aktif
          </label>
          <label>
            Not
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <div className="expense-form-actions">
            <button type="submit">{editingId ? 'Güncelle' : 'Kaydet'}</button>
            {editingId && (
              <button type="button" onClick={cancelEdit}>
                İptal
              </button>
            )}
          </div>
        </form>
      </details>
    </div>
  )
}
