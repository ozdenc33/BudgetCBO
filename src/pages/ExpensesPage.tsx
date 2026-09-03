import { useMemo, useState, type FormEvent } from 'react'
import { deleteField, type UpdateData } from 'firebase/firestore'
import { useToday } from '../hooks/useToday'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
} from '../lib/firestoreTransactions'
import { computeTransaction } from '../domain/transactions'
import { findDuplicateTransaction } from '../domain/duplicates'
import { filterTransactions, sumFilteredEUR, type TransactionFilter } from '../domain/filters'
import { isFutureDated } from '../domain/futureDated'
import { TransactionFilters } from '../components/TransactionFilters'
import type { Currency, Transaction, TransactionDraft } from '../domain/types'
import { todayISO, todayMonthKey } from '../domain/dates'
import { MIKE_THANKS_NOTE, isMikeExpense } from '../domain/personalNotes'
import { useWrite } from '../hooks/useWrite'
import { useToast } from '../components/ToastProvider'

type FormState = {
  date: string
  description: string
  category: string
  amount: string
  currency: Currency
  account: string
  canPct: string
  tugcePct: string
  tag: string
  note: string
}

function emptyForm(): FormState {
  return {
    date: todayISO(),
    description: '',
    category: '',
    amount: '',
    currency: 'EUR',
    account: '',
    canPct: '',
    tugcePct: '',
    tag: '',
    note: '',
  }
}

function formToDraft(form: FormState): TransactionDraft {
  // Firestore addDoc/updateDoc, "undefined" degerli alanlari reddeder;
  // opsiyonel alanlar bossa nesneye hic eklenmez (deger olarak
  // undefined atanmaz).
  const draft: TransactionDraft = {
    date: form.date,
    description: form.description.trim(),
    category: form.category,
    amount: Number(form.amount),
    currency: form.currency,
    account: form.account,
  }
  if (form.canPct !== '') draft.canPct = Number(form.canPct) / 100
  if (form.tugcePct !== '') draft.tugcePct = Number(form.tugcePct) / 100
  if (form.tag.trim()) draft.tag = form.tag.trim()
  if (form.note.trim()) draft.note = form.note.trim()
  return draft
}

// Guncellemede, kullanici bir opsiyonel alani boşaltmışsa Firestore'dan
// gercekten silinmesi gerekir; aksi halde eski deger kalir. addTransaction
// icin bu gerekmez, cunku yeni dokumanda hic yoktur.
function formToUpdatePayload(form: FormState): UpdateData<TransactionDraft> {
  return {
    date: form.date,
    description: form.description.trim(),
    category: form.category,
    amount: Number(form.amount),
    currency: form.currency,
    account: form.account,
    canPct: form.canPct === '' ? deleteField() : Number(form.canPct) / 100,
    tugcePct: form.tugcePct === '' ? deleteField() : Number(form.tugcePct) / 100,
    tag: form.tag.trim() ? form.tag.trim() : deleteField(),
    note: form.note.trim() ? form.note.trim() : deleteField(),
  }
}

function transactionToForm(tx: Transaction): FormState {
  return {
    date: tx.date,
    description: tx.description,
    category: tx.category,
    amount: String(tx.amount),
    currency: (tx.currency || 'EUR') as Currency,
    account: tx.account,
    canPct: tx.canPct != null ? String(Math.round(tx.canPct * 100)) : '',
    tugcePct: tx.tugcePct != null ? String(Math.round(tx.tugcePct * 100)) : '',
    tag: tx.tag ?? '',
    note: tx.note ?? '',
  }
}

export function ExpensesPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<TransactionFilter>(() => ({
    monthKey: todayMonthKey(),
  }))
  const [saving, setSaving] = useState(false)
  const today = useToday()
  const runWrite = useWrite()
  const { showToast } = useToast()

  const preview = useMemo(
    () => computeTransaction({ id: 'preview', ...formToDraft(form) }, settings),
    [form, settings],
  )

  const visibleTransactions = useMemo(() => {
    const computed = transactions.map((t) => computeTransaction(t, settings))
    return filterTransactions(computed, filter).sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, settings, filter])

  const visibleTotalEUR = useMemo(() => sumFilteredEUR(visibleTransactions), [visibleTransactions])

  const canSubmit =
    form.category !== '' &&
    form.amount !== '' &&
    form.account !== '' &&
    (preview.validation === 'OK' || preview.validation === '')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (!editingId) {
      const duplicate = findDuplicateTransaction(formToDraft(form), transactions)
      if (duplicate) {
        const label = duplicate.description || duplicate.category
        if (!window.confirm(`${form.date} tarihinde, aynı tutar ve kategoride "${label}" adlı bir kayıt zaten var. Yine de kaydedilsin mi?`)) {
          return
        }
      }
    }
    const draft = formToDraft(form)
    setSaving(true)
    try {
      const ok = editingId
        ? await runWrite(updateTransaction(editingId, formToUpdatePayload(form)), {
            failureMessage: 'Harcama güncellenemedi',
          })
        : await runWrite(addTransaction(draft), { failureMessage: 'Harcama kaydedilemedi' })
      if (!ok) return
      // Mike'in butcesine giren her harcamada kucuk bir tesekkur
      // (bkz. src/domain/personalNotes.ts).
      if (isMikeExpense(draft, settings)) {
        showToast({ message: MIKE_THANKS_NOTE, tone: 'fun', durationMs: 5000, key: 'mike-thanks' })
      }
      setForm(emptyForm())
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setFormOpen(true)
    setForm(transactionToForm(tx))
  }

  // "Tekrarla": ayni kayittan bugune yenisini hazirlar (kaydetmez, form
  // acilir ki tutari degistirebilesin).
  function repeat(tx: Transaction) {
    setEditingId(null)
    setFormOpen(true)
    setForm({ ...transactionToForm(tx), date: todayISO() })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu harcamayı silmek istediğinize emin misiniz?')) return
    await runWrite(deleteTransaction(id), { failureMessage: 'Harcama silinemedi' })
  }

  if (settingsLoading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="expenses-page">
      <details
        className="form-details"
        open={formOpen}
        onToggle={(e) => setFormOpen(e.currentTarget.open)}
      >
        <summary className="form-summary">
          {editingId ? 'Harcamayı düzenle' : '+ Yeni harcama'}
        </summary>
        <form className="expense-form" onSubmit={handleSubmit}>
        <label>
          Tarih
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </label>
        <label>
          Açıklama
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
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
          Tutar
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </label>
        <label>
          Hesap
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
          Para Birimi
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
          >
            <option value="EUR">EUR</option>
            <option value="TRY">TRY</option>
          </select>
        </label>
        <div className="expense-form-row">
          <label>
            Can %
            <input
              type="number"
              min="0"
              max="100"
              placeholder="—"
              value={form.canPct}
              onChange={(e) => setForm({ ...form, canPct: e.target.value, tugcePct: '' })}
            />
          </label>
          <label>
            Tuğçe %
            <input
              type="number"
              min="0"
              max="100"
              placeholder="—"
              value={form.tugcePct}
              onChange={(e) => setForm({ ...form, tugcePct: e.target.value, canPct: '' })}
            />
          </label>
        </div>
        <label>
          Etiket
          <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
        </label>
        <label>
          Not
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        {form.category && form.amount && form.account && (
          <div
            className={
              preview.validation === 'OK'
                ? 'expense-preview expense-preview--ok'
                : 'expense-preview expense-preview--error'
            }
          >
            {preview.validation === 'OK' ? (
              <>
                <span>{preview.budgetType}</span>
                <span>
                  {preview.amountEUR?.toFixed(2)} EUR
                  {preview.rateSource === 'default' && form.currency === 'TRY'
                    ? ' (varsayılan kur ile)'
                    : ''}
                </span>
                <span>
                  Can {preview.canShare?.toFixed(2)} / Tuğçe {preview.tugceShare?.toFixed(2)}
                </span>
              </>
            ) : (
              <span>{preview.validation}</span>
            )}
          </div>
        )}

        {preview.rateWarning && (
          <div className="expense-preview expense-preview--warning">
            <span>{preview.rateWarning}</span>
          </div>
        )}

        <div className="expense-form-actions">
          <button type="submit" disabled={!canSubmit || saving}>
            {editingId ? 'Güncelle' : 'Kaydet'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>
              İptal
            </button>
          )}
        </div>
      </form>
      </details>

      <TransactionFilters
        filter={filter}
        onChange={setFilter}
        settings={settings}
        resultCount={visibleTransactions.length}
        resultTotalEUR={visibleTotalEUR}
      />

      {txLoading ? (
        <p>Yükleniyor...</p>
      ) : visibleTransactions.length === 0 ? (
        <p className="expenses-empty">Bu filtreye uyan kayıt yok.</p>
      ) : (
        <ul className="expenses-list">
          {visibleTransactions.map((t) => (
            <li key={t.id} className="expense-row">
              <div className="expense-row-main">
                <span className="expense-row-date">
                  {t.date}
                  {isFutureDated(t.date, today) && (
                    <span className="badge-future">ileri tarihli</span>
                  )}
                </span>
                <span className="expense-row-desc">{t.description || t.category}</span>
                <span className="expense-row-amount">
                  {t.amount} {t.currency || 'EUR'}
                </span>
              </div>
              <div className="expense-row-meta">
                <span>{t.category}</span>
                <span>{t.account}</span>
                <span>{t.budgetType}</span>
                <span
                  className={
                    t.validation === 'OK' ? 'expense-badge expense-badge--ok' : 'expense-badge'
                  }
                >
                  {t.validation}
                </span>
                {t.rateWarning && (
                  <span className="expense-badge expense-badge--warning" title={t.rateWarning}>
                    kur eksik
                  </span>
                )}
              </div>
              <div className="expense-row-actions">
                <button onClick={() => startEdit(t)}>Düzenle</button>
                <button onClick={() => repeat(t)}>Tekrarla</button>
                <button onClick={() => handleDelete(t.id)}>Sil</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
