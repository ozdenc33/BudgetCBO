import { useMemo, useState, type FormEvent } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useTransfers } from '../hooks/useTransfers'
import { useGoals } from '../hooks/useGoals'
import { addGoal, deleteGoal, updateGoal } from '../lib/firestoreGoals'
import { computeGoals } from '../domain/goals'
import type { Goal, GoalDraft, GoalOwner } from '../domain/types'

const OWNERS: GoalOwner[] = ['Ortak', 'Can', 'Tuğçe']

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(value: number | undefined): string {
  if (value == null) return '—'
  return (value * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + '%'
}

type FormState = {
  name: string
  owner: GoalOwner
  targetAmount: string
  targetDate: string
  note: string
}

function emptyForm(): FormState {
  return { name: '', owner: 'Ortak', targetAmount: '', targetDate: '', note: '' }
}

function formToDraft(form: FormState): GoalDraft {
  const draft: GoalDraft = { name: form.name.trim(), owner: form.owner }
  if (form.targetAmount !== '') draft.targetAmount = Number(form.targetAmount)
  if (form.targetDate !== '') draft.targetDate = form.targetDate
  if (form.note.trim()) draft.note = form.note.trim()
  return draft
}

function goalToForm(goal: Goal): FormState {
  return {
    name: goal.name,
    owner: goal.owner,
    targetAmount: goal.targetAmount != null ? String(goal.targetAmount) : '',
    targetDate: goal.targetDate ?? '',
    note: goal.note ?? '',
  }
}

export function GoalsPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transfers, loading: transfersLoading } = useTransfers()
  const { goals, loading: goalsLoading } = useGoals()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const loading = settingsLoading || transfersLoading || goalsLoading
  const today = useMemo(() => new Date(), [])

  const computed = useMemo(
    () => computeGoals(goals, transfers, settings, today),
    [goals, transfers, settings, today],
  )

  const totals = useMemo(
    () => ({
      targetEUR: computed.reduce((s, g) => s + (g.targetAmount ?? 0), 0),
      accumulatedEUR: computed.reduce((s, g) => s + g.accumulatedEUR, 0),
      remainingEUR: computed.reduce((s, g) => s + (g.remainingEUR ?? 0), 0),
      canEUR: computed.reduce((s, g) => s + g.canContributionEUR, 0),
      tugceEUR: computed.reduce((s, g) => s + g.tugceContributionEUR, 0),
    }),
    [computed],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const draft = formToDraft(form)
    if (editingId) {
      await updateGoal(editingId, draft)
    } else {
      await addGoal(draft)
    }
    setForm(emptyForm())
    setEditingId(null)
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id)
    setFormOpen(true)
    setForm(goalToForm(goal))
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu hedefi silmek istediğinize emin misiniz?')) return
    await deleteGoal(id)
  }

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="goals-page">
      <p className="balances-note">
        Hedefe para ayırınca Transferler sayfasına Tip = Tasarruf, Alıcı = hedef adı olarak girin.
        Biriken otomatik hesaplanır.
      </p>

      <ul className="goals-list">
        {computed.map((g) => (
          <li key={g.id} className="goal-card">
            <div className="goal-card-header">
              <span className="goal-card-name">{g.name}</span>
              <span className="goal-card-owner">{g.owner}</span>
            </div>
            {g.targetAmount != null && (
              <div className="goal-progress-track">
                <div
                  className="goal-progress-fill"
                  style={{ width: `${Math.min(100, (g.progressPct ?? 0) * 100)}%` }}
                />
              </div>
            )}
            <div className="goal-card-meta">
              <span>
                Biriken {fmt(g.accumulatedEUR)} € {g.targetAmount != null ? `/ ${fmt(g.targetAmount)} €` : ''}
              </span>
              <span>İlerleme {fmtPct(g.progressPct)}</span>
              {g.remainingMonths != null && <span>Kalan {g.remainingMonths} ay</span>}
              {g.monthlyRequiredEUR != null && <span>Aylık gereken {fmt(g.monthlyRequiredEUR)} €</span>}
            </div>
            <div className="goal-card-meta">
              <span>Can {fmt(g.canContributionEUR)} €</span>
              <span>Tuğçe {fmt(g.tugceContributionEUR)} €</span>
              {g.targetDate && <span>Hedef tarih {g.targetDate}</span>}
            </div>
            <div className="expense-row-actions">
              <button onClick={() => startEdit(g)}>Düzenle</button>
              <button onClick={() => handleDelete(g.id)}>Sil</button>
            </div>
          </li>
        ))}
      </ul>

      {computed.length > 0 && (
        <div className="balances-total">
          <span>Toplam: biriken {fmt(totals.accumulatedEUR)} € / hedef {fmt(totals.targetEUR)} €</span>
          <span>Kalan {fmt(totals.remainingEUR)} €</span>
        </div>
      )}

      <details
        className="form-details"
        open={formOpen}
        onToggle={(e) => setFormOpen(e.currentTarget.open)}
      >
        <summary className="form-summary">
          {editingId ? 'Hedefi düzenle' : '+ Yeni hedef'}
        </summary>
        <form className="expense-form" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Hedefi Düzenle' : 'Yeni Hedef'}</h2>
        <label>
          Hedef
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Sahip
          <select
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value as GoalOwner })}
          >
            {OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hedef Tutar (EUR, opsiyonel)
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
          />
        </label>
        <label>
          Hedef Tarih (opsiyonel)
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          />
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
