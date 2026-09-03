import { useMemo, useState, type FormEvent } from 'react'
import { deleteField, type UpdateData } from 'firebase/firestore'
import { useSettings } from '../hooks/useSettings'
import { useIncomes } from '../hooks/useIncomes'
import { addIncome, deleteIncome, updateIncome } from '../lib/firestoreIncomes'
import { computeIncome } from '../domain/incomes'
import { monthKeyOf } from '../domain/rate'
import type { Currency, Income, IncomeDraft, Person } from '../domain/types'
import { todayISO, todayMonthKey } from '../domain/dates'
import { useWrite } from '../hooks/useWrite'

type FormState = {
  date: string
  source: string
  person: Person
  amount: string
  currency: Currency
  account: string
  note: string
}

function emptyForm(): FormState {
  return {
    date: todayISO(),
    source: '',
    person: 'Can',
    amount: '',
    currency: 'EUR',
    account: '',
    note: '',
  }
}

function formToDraft(form: FormState): IncomeDraft {
  const draft: IncomeDraft = {
    date: form.date,
    source: form.source,
    person: form.person,
    amount: Number(form.amount),
    currency: form.currency,
    account: form.account,
  }
  if (form.note.trim()) draft.note = form.note.trim()
  return draft
}

function formToUpdatePayload(form: FormState): UpdateData<IncomeDraft> {
  return {
    date: form.date,
    source: form.source,
    person: form.person,
    amount: Number(form.amount),
    currency: form.currency,
    account: form.account,
    note: form.note.trim() ? form.note.trim() : deleteField(),
  }
}

function incomeToForm(income: Income): FormState {
  return {
    date: income.date,
    source: income.source,
    person: income.person,
    amount: String(income.amount),
    currency: (income.currency || 'EUR') as Currency,
    account: income.account,
    note: income.note ?? '',
  }
}

export function IncomesPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { incomes, loading: incomesLoading } = useIncomes()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [month, setMonth] = useState(todayMonthKey)
  const [saving, setSaving] = useState(false)
  const runWrite = useWrite()

  const preview = useMemo(
    () => computeIncome({ id: 'preview', ...formToDraft(form) }, settings),
    [form, settings],
  )

  const monthIncomes = useMemo(() => {
    return incomes
      .filter((i) => monthKeyOf(i.date) === month)
      .map((i) => computeIncome(i, settings))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [incomes, settings, month])

  const canSubmit =
    form.source !== '' &&
    form.amount !== '' &&
    form.account !== '' &&
    (preview.validation === 'OK' || preview.validation === '')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    try {
      const ok = editingId
        ? await runWrite(updateIncome(editingId, formToUpdatePayload(form)), {
            failureMessage: 'Gelir güncellenemedi',
          })
        : await runWrite(addIncome(formToDraft(form)), { failureMessage: 'Gelir kaydedilemedi' })
      if (!ok) return
      setForm(emptyForm())
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(income: Income) {
    setEditingId(income.id)
    setFormOpen(true)
    setForm(incomeToForm(income))
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu geliri silmek istediğinize emin misiniz?')) return
    await runWrite(deleteIncome(id), { failureMessage: 'Gelir silinemedi' })
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
          {editingId ? 'Geliri düzenle' : '+ Yeni gelir'}
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
          Kaynak
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            required
          >
            <option value="" disabled>
              Seçin
            </option>
            {settings.incomeSources.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kişi
          <select
            value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value as Person })}
          >
            <option value="Can">Can</option>
            <option value="Tuğçe">Tuğçe</option>
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
        <label>
          Not
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        {form.source && form.amount && form.account && (
          <div
            className={
              preview.validation === 'OK'
                ? 'expense-preview expense-preview--ok'
                : 'expense-preview expense-preview--error'
            }
          >
            {preview.validation === 'OK' ? (
              <span>
                {preview.amountEUR?.toFixed(2)} EUR
                {preview.rateSource === 'default' && form.currency === 'TRY'
                  ? ' (varsayılan kur ile)'
                  : ''}
              </span>
            ) : (
              <span>{preview.validation}</span>
            )}
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

      <div className="expenses-list-header">
        <label>
          Ay
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
      </div>

      {incomesLoading ? (
        <p>Yükleniyor...</p>
      ) : monthIncomes.length === 0 ? (
        <p className="expenses-empty">Bu ayda henüz gelir yok.</p>
      ) : (
        <ul className="expenses-list">
          {monthIncomes.map((i) => (
            <li key={i.id} className="expense-row">
              <div className="expense-row-main">
                <span className="expense-row-date">{i.date}</span>
                <span className="expense-row-desc">{i.source}</span>
                <span className="expense-row-amount">
                  {i.amount} {i.currency || 'EUR'}
                </span>
              </div>
              <div className="expense-row-meta">
                <span>{i.person}</span>
                <span>{i.account}</span>
                <span
                  className={
                    i.validation === 'OK' ? 'expense-badge expense-badge--ok' : 'expense-badge'
                  }
                >
                  {i.validation}
                </span>
              </div>
              <div className="expense-row-actions">
                <button onClick={() => startEdit(i)}>Düzenle</button>
                <button onClick={() => handleDelete(i.id)}>Sil</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
