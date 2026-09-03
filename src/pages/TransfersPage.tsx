import { useMemo, useState, type FormEvent } from 'react'
import { deleteField, type UpdateData } from 'firebase/firestore'
import { useSettings } from '../hooks/useSettings'
import { useTransfers } from '../hooks/useTransfers'
import { addTransfer, deleteTransfer, updateTransfer } from '../lib/firestoreTransfers'
import { computeTransfer } from '../domain/transfers'
import { monthKeyOf } from '../domain/rate'
import { TRANSFER_TYPES, PERSONS } from '../domain/constants'
import type { Currency, Transfer, TransferDraft, TransferType } from '../domain/types'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type FormState = {
  date: string
  type: TransferType
  from: string
  to: string
  amount: string
  currency: Currency
  fromAccount: string
  toAccount: string
  note: string
}

function emptyForm(): FormState {
  return {
    date: todayIso(),
    type: 'Ortak Kasa Katkısı',
    from: 'Can',
    to: '',
    amount: '',
    currency: 'EUR',
    fromAccount: '',
    toAccount: '',
    note: '',
  }
}

function formToDraft(form: FormState): TransferDraft {
  const draft: TransferDraft = {
    date: form.date,
    type: form.type,
    from: form.from,
    to: form.to,
    amount: Number(form.amount),
    currency: form.currency,
    fromAccount: form.fromAccount,
    toAccount: form.toAccount,
  }
  if (form.note.trim()) draft.note = form.note.trim()
  return draft
}

function formToUpdatePayload(form: FormState): UpdateData<TransferDraft> {
  return {
    date: form.date,
    type: form.type,
    from: form.from,
    to: form.to,
    amount: Number(form.amount),
    currency: form.currency,
    fromAccount: form.fromAccount,
    toAccount: form.toAccount,
    note: form.note.trim() ? form.note.trim() : deleteField(),
  }
}

function transferToForm(transfer: Transfer): FormState {
  return {
    date: transfer.date,
    type: transfer.type,
    from: transfer.from,
    to: transfer.to,
    amount: String(transfer.amount),
    currency: (transfer.currency || 'EUR') as Currency,
    fromAccount: transfer.fromAccount,
    toAccount: transfer.toAccount,
    note: transfer.note ?? '',
  }
}

export function TransfersPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transfers, loading: transfersLoading } = useTransfers()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [month, setMonth] = useState(() => todayIso().slice(0, 7))
  const [saving, setSaving] = useState(false)

  const preview = useMemo(
    () => computeTransfer({ id: 'preview', ...formToDraft(form) }, settings),
    [form, settings],
  )

  const monthTransfers = useMemo(() => {
    return transfers
      .filter((t) => monthKeyOf(t.date) === month)
      .map((t) => computeTransfer(t, settings))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [transfers, settings, month])

  const canSubmit =
    form.to.trim() !== '' &&
    form.amount !== '' &&
    (preview.validation === 'OK' || preview.validation === '')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    try {
      if (editingId) {
        await updateTransfer(editingId, formToUpdatePayload(form))
      } else {
        await addTransfer(formToDraft(form))
      }
      setForm(emptyForm())
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(transfer: Transfer) {
    setEditingId(transfer.id)
    setFormOpen(true)
    setForm(transferToForm(transfer))
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu transferi silmek istediğinize emin misiniz?')) return
    await deleteTransfer(id)
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
          {editingId ? 'Transferi düzenle' : '+ Yeni transfer'}
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
          Tip
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TransferType })}
          >
            {TRANSFER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Gönderen
          <select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
            {PERSONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alıcı
          <input
            list="transfer-recipients"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            placeholder="Ortak Kasa, Can, Tuğçe veya hedef adı"
            required
          />
          <datalist id="transfer-recipients">
            <option value="Ortak Kasa" />
            <option value="Can" />
            <option value="Tuğçe" />
          </datalist>
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
          Kaynak Hesap
          <select
            value={form.fromAccount}
            onChange={(e) => setForm({ ...form, fromAccount: e.target.value })}
          >
            <option value="">Seçin (opsiyonel)</option>
            {settings.accounts.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hedef Hesap
          <select
            value={form.toAccount}
            onChange={(e) => setForm({ ...form, toAccount: e.target.value })}
          >
            <option value="">Seçin (opsiyonel)</option>
            {settings.accounts.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Not
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        {form.to && form.amount && (
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

      {transfersLoading ? (
        <p>Yükleniyor...</p>
      ) : monthTransfers.length === 0 ? (
        <p className="expenses-empty">Bu ayda henüz transfer yok.</p>
      ) : (
        <ul className="expenses-list">
          {monthTransfers.map((t) => (
            <li key={t.id} className="expense-row">
              <div className="expense-row-main">
                <span className="expense-row-date">{t.date}</span>
                <span className="expense-row-desc">
                  {t.from} → {t.to}
                </span>
                <span className="expense-row-amount">
                  {t.amount} {t.currency || 'EUR'}
                </span>
              </div>
              <div className="expense-row-meta">
                <span>{t.type}</span>
                <span
                  className={
                    t.validation === 'OK' ? 'expense-badge expense-badge--ok' : 'expense-badge'
                  }
                >
                  {t.validation}
                </span>
              </div>
              <div className="expense-row-actions">
                <button onClick={() => startEdit(t)}>Düzenle</button>
                <button onClick={() => handleDelete(t.id)}>Sil</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
