import { useMemo, useState, type FormEvent } from 'react'
import { useToday } from '../hooks/useToday'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useRecurring } from '../hooks/useRecurring'
import { useRecurringSkips } from '../hooks/useRecurringSkips'
import { addRecurring, deleteRecurring, updateRecurring } from '../lib/firestoreRecurring'
import { skipRecurringForMonth, unskipRecurringForMonth } from '../lib/firestoreRecurringSkips'
import { addTransaction } from '../lib/firestoreTransactions'
import { addIncome } from '../lib/firestoreIncomes'
import {
  computeRecurringItems,
  draftIncomesForMonth,
  draftTransactionsForMonth,
} from '../domain/recurring'
import { BUDGET_TYPES_ORDER } from '../domain/dashboard'
import { todayMonthKey } from '../domain/dates'
import { useWrite } from '../hooks/useWrite'
import { MIKE_THANKS_NOTE, isMikeExpense } from '../domain/personalNotes'
import { useToast } from '../components/ToastProvider'
import type {
  BudgetType,
  Currency,
  FrequencyMonths,
  IncomeDraft,
  Person,
  RecurringItem,
  RecurringItemDraft,
  RecurringKind,
  TransactionDraft,
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
  tamamlandı: 'Tamamlandı',
}

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type FormState = {
  name: string
  kind: RecurringKind
  budgetType: BudgetType
  category: string
  person: Person
  amount: string
  currency: Currency
  frequencyMonths: FrequencyMonths
  account: string
  firstPaymentDate: string
  paymentCount: string
  active: boolean
  note: string
}

function emptyForm(kind: RecurringKind = 'expense'): FormState {
  return {
    name: '',
    kind,
    budgetType: 'Ortak-Ev',
    category: '',
    person: 'Can',
    amount: '',
    currency: 'EUR',
    frequencyMonths: 1,
    account: '',
    firstPaymentDate: todayMonthKey() + '-01',
    paymentCount: '',
    active: true,
    note: '',
  }
}

function formToDraft(form: FormState): RecurringItemDraft {
  const draft: RecurringItemDraft = {
    name: form.name.trim(),
    kind: form.kind,
    currency: form.currency,
    frequencyMonths: form.frequencyMonths,
    account: form.account,
    firstPaymentDate: form.firstPaymentDate,
    active: form.active,
  }
  if (form.kind === 'expense') {
    draft.budgetType = form.budgetType
    draft.category = form.category
  } else {
    draft.person = form.person
  }
  if (form.amount !== '') draft.amount = Number(form.amount)
  if (form.paymentCount !== '') draft.paymentCount = Number(form.paymentCount)
  if (form.note.trim()) draft.note = form.note.trim()
  return draft
}

function itemToForm(item: RecurringItem): FormState {
  return {
    name: item.name,
    kind: item.kind,
    budgetType: item.budgetType ?? 'Ortak-Ev',
    category: item.category ?? '',
    person: item.person ?? 'Can',
    amount: item.amount != null ? String(item.amount) : '',
    currency: item.currency ?? 'EUR',
    frequencyMonths: item.frequencyMonths,
    account: item.account,
    firstPaymentDate: item.firstPaymentDate,
    paymentCount: item.paymentCount != null ? String(item.paymentCount) : '',
    active: item.active,
    note: item.note ?? '',
  }
}

// Taslak listesi gider ve gelir kalemlerini birlikte gosterir; her
// satir kendi turunu tasir ki onaylandiginda dogru koleksiyona
// (transactions/incomes) yazilsin.
type DraftRow =
  | { kind: 'expense'; item: RecurringItem; draft: TransactionDraft }
  | { kind: 'income'; item: RecurringItem; draft: IncomeDraft }

export function RecurringPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { items, loading: itemsLoading } = useRecurring()
  const { skips, loading: skipsLoading } = useRecurringSkips()
  const [month, setMonth] = useState(todayMonthKey)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({})
  const [confirmingAll, setConfirmingAll] = useState(false)

  const loading = settingsLoading || txLoading || incomesLoading || itemsLoading || skipsLoading
  const today = useToday()
  const runWrite = useWrite()
  const { showToast } = useToast()

  const computedItems = useMemo(
    () => computeRecurringItems(items, month, transactions, settings, today, incomes),
    [items, month, transactions, settings, today, incomes],
  )

  const skippedIds = useMemo(
    () => new Set(skips.filter((s) => s.monthKey === month).map((s) => s.recurringId)),
    [skips, month],
  )

  const expenseDrafts = useMemo(
    () =>
      draftTransactionsForMonth(items, month, transactions, settings, today, skippedIds, incomes),
    [items, month, transactions, settings, today, skippedIds, incomes],
  )
  const incomeDrafts = useMemo(
    () => draftIncomesForMonth(items, month, transactions, settings, today, skippedIds, incomes),
    [items, month, transactions, settings, today, skippedIds, incomes],
  )
  const drafts: DraftRow[] = useMemo(
    () => [
      ...expenseDrafts.map((d): DraftRow => ({ kind: 'expense', item: d.item, draft: d.draft })),
      ...incomeDrafts.map((d): DraftRow => ({ kind: 'income', item: d.item, draft: d.draft })),
    ],
    [expenseDrafts, incomeDrafts],
  )

  async function handleConfirm(row: DraftRow) {
    const raw = draftAmounts[row.item.id]
    const amount = raw !== undefined && raw !== '' ? Number(raw) : (row.item.amount ?? 0)

    if (row.kind === 'expense') {
      const draft = { ...row.draft, amount }
      const ok = await runWrite(addTransaction(draft), {
        failureMessage: 'Sabit gider kaydedilemedi',
      })
      // Sabit gider de Mike'in butcesine girebilir (orn. duzenli mama
      // siparisi); tesekkur notu orada da ciksin.
      if (ok && isMikeExpense(draft, settings)) {
        showToast({ message: MIKE_THANKS_NOTE, tone: 'fun', durationMs: 5000, key: 'mike-thanks' })
      }
    } else {
      await runWrite(addIncome({ ...row.draft, amount }), {
        failureMessage: 'Sabit gelir kaydedilemedi',
      })
    }
  }

  /**
   * Tum taslaklari tek dokunusla onaylar.
   *
   * Tutari GIRILMEMIS kalemler bilerek disarida birakilir: onlar icin
   * ne kadar yazilacagi belirsizdir ve sessizce 0 yazmak butceyi
   * bozar. Kullanici onlari tek tek onaylar.
   */
  async function handleConfirmAll() {
    const ready = drafts.filter(
      ({ item }) => (draftAmounts[item.id] ?? '') !== '' || item.amount != null,
    )
    if (ready.length === 0) return
    const totalEUR = ready.reduce((sum, { item }) => {
      const raw = draftAmounts[item.id]
      return sum + (raw !== undefined && raw !== '' ? Number(raw) : (item.amount ?? 0))
    }, 0)
    if (
      !window.confirm(
        `${ready.length} kalem ${totalEUR.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € toplamla kaydedilecek. Devam edilsin mi?`,
      )
    ) {
      return
    }
    setConfirmingAll(true)
    try {
      for (const row of ready) {
        await handleConfirm(row)
      }
    } finally {
      setConfirmingAll(false)
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
          failureMessage: 'Kalem güncellenemedi',
        })
      : await runWrite(addRecurring(draft), { failureMessage: 'Kalem eklenemedi' })
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
    if (!window.confirm('Bu kalemi silmek istediğinize emin misiniz?')) return
    await runWrite(deleteRecurring(id), { failureMessage: 'Kalem silinemedi' })
  }

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  const skippedActiveItems = computedItems.filter((c) => skippedIds.has(c.id))
  const readyCount = drafts.filter(
    ({ item }) => (draftAmounts[item.id] ?? '') !== '' || item.amount != null,
  ).length

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
          <div className="panel-head">
            <h2>Taslak Kalemler ({drafts.length})</h2>
            {readyCount > 1 && (
              <button type="button" onClick={handleConfirmAll} disabled={confirmingAll}>
                {confirmingAll ? 'Kaydediliyor...' : 'Tümünü onayla'}
              </button>
            )}
          </div>
          <p className="settings-note">
            Tutarı girilmemiş kalemler "Tümünü onayla" kapsamına girmez; onları tek tek onaylayın.
          </p>
          <ul className="draft-list">
            {drafts.map((row) => (
              <li key={row.item.id} className="draft-row">
                <div className="draft-row-main">
                  <span className="draft-row-name">
                    {row.kind === 'income' && <span className="draft-row-badge">Gelir</span>}
                    {row.item.name}
                  </span>
                  <span className="draft-row-meta">
                    {row.kind === 'expense' ? row.item.category : row.item.person} ·{' '}
                    {row.item.account} · {row.draft.date}
                  </span>
                </div>
                <div className="draft-row-actions">
                  <input
                    type="number"
                    step="0.01"
                    placeholder={row.item.amount != null ? String(row.item.amount) : 'Tutar'}
                    value={
                      draftAmounts[row.item.id] ??
                      (row.item.amount != null ? String(row.item.amount) : '')
                    }
                    onChange={(e) =>
                      setDraftAmounts({ ...draftAmounts, [row.item.id]: e.target.value })
                    }
                  />
                  <button onClick={() => handleConfirm(row)}>Onayla</button>
                  <button onClick={() => handleSkip(row.item.id)}>Atla</button>
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
        <h2>Sabit Gider ve Gelir Listesi</h2>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Kalem</th>
                <th>Tür</th>
                <th>Bütçe / Kişi</th>
                <th>Kategori</th>
                <th>Tutar</th>
                <th>Sıklık</th>
                <th>Hesap</th>
                <th>Sonraki Ödeme</th>
                <th>Kalan Gün</th>
                <th>Ödeme No</th>
                <th>Seçili Ay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {computedItems.map((c) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'left' }}>{c.name}</td>
                  <td>{c.kind === 'income' ? 'Gelir' : 'Gider'}</td>
                  <td>{c.kind === 'income' ? c.person : c.budgetType}</td>
                  <td>{c.kind === 'income' ? '—' : c.category}</td>
                  <td>{c.amount != null ? `${fmt(c.amount)} ${c.currency ?? 'EUR'}` : '—'}</td>
                  <td>{FREQUENCIES.find((f) => f.value === c.frequencyMonths)?.label}</td>
                  <td>{c.account}</td>
                  <td>{c.nextPaymentDate ?? '—'}</td>
                  <td>{c.remainingDays ?? '—'}</td>
                  <td>
                    {c.paymentIndex ?? '—'}
                    {c.paymentCount != null ? ` / ${c.paymentCount}` : ''}
                  </td>
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
          {editingId ? 'Kalemi düzenle' : '+ Yeni sabit gider / gelir'}
        </summary>
        <form className="expense-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Kalemi Düzenle' : 'Yeni Kalem'}</h2>
          <label>
            Tür
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as RecurringKind })}
              disabled={Boolean(editingId)}
            >
              <option value="expense">Sabit Gider</option>
              <option value="income">Sabit Gelir</option>
            </select>
          </label>
          <label>
            Kalem
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.kind === 'income' ? 'Örn. KYK Kredisi' : 'Örn. Kira'}
              required
            />
          </label>
          {form.kind === 'expense' ? (
            <>
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
            </>
          ) : (
            <label>
              Kişi (kim alacak)
              <select
                value={form.person}
                onChange={(e) => setForm({ ...form, person: e.target.value as Person })}
              >
                <option value="Can">Can</option>
                <option value="Tuğçe">Tuğçe</option>
              </select>
            </label>
          )}
          <div className="expense-form-row">
            <label>
              Tutar (opsiyonel)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <label>
              Para Birimi
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
              >
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
              </select>
            </label>
          </div>
          {form.currency === 'TRY' && (
            <p className="settings-note">
              TL tutar, onaylandığı ayın kuruyla otomatik EUR'a çevrilir (Ayarlar'daki kur veya
              makas farkı ile). Kur girilmemişse uyarı gösterilir.
            </p>
          )}
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
          <label>
            Toplam Ödeme Sayısı (opsiyonel)
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Örn. 12 — boşsa süresiz"
              value={form.paymentCount}
              onChange={(e) => setForm({ ...form, paymentCount: e.target.value })}
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
