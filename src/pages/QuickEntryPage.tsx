import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { addTransaction } from '../lib/firestoreTransactions'
import { computeTransaction } from '../domain/transactions'
import { findDuplicateTransaction } from '../domain/duplicates'
import {
  getDefaultAccount,
  getRecentCategories,
  pushRecentCategory,
  setDefaultAccount,
} from '../lib/localPrefs'
import { MIKE_THANKS_NOTE, isMikeExpense } from '../domain/personalNotes'
import { useWrite } from '../hooks/useWrite'
import { useToast } from '../components/ToastProvider'
import type { TransactionDraft } from '../domain/types'
import { todayISO } from '../domain/dates'

export function QuickEntryPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()

  const [date, setDate] = useState(todayISO)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [account, setAccount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pendingDuplicate, setPendingDuplicate] = useState<TransactionDraft | null>(null)
  const runWrite = useWrite()
  const { showToast } = useToast()

  const recentCategories = useMemo(() => {
    const recent = getRecentCategories()
    const known = new Set(settings.categories.map((c) => c.name))
    return recent.filter((c) => known.has(c))
  }, [settings.categories])

  useEffect(() => {
    if (settings.accounts.length === 0) return
    const saved = getDefaultAccount()
    const valid = saved && settings.accounts.some((a) => a.name === saved)
    setAccount((current) => current || (valid ? saved! : settings.accounts[0].name))
  }, [settings.accounts])

  const draft: TransactionDraft = {
    date,
    description: description.trim(),
    category,
    amount: Number(amount),
    currency: 'EUR',
    account,
  }

  const preview = useMemo(
    () => computeTransaction({ id: 'preview', ...draft }, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, amount, category, account, settings],
  )

  const canSubmit =
    amount !== '' && category !== '' && account !== '' && (preview.validation === 'OK' || preview.validation === '')

  async function commitSave(finalDraft: TransactionDraft) {
    setSaving(true)
    try {
      const ok = await runWrite(addTransaction(finalDraft), {
        failureMessage: 'Harcama kaydedilemedi',
      })
      if (!ok) return
      pushRecentCategory(finalDraft.category)
      setDefaultAccount(finalDraft.account)
      setAmount('')
      setDescription('')
      setPendingDuplicate(null)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
      // Mike'in butcesine giren harcamalarda kucuk bir tesekkur
      // (bkz. src/domain/personalNotes.ts).
      if (isMikeExpense(finalDraft, settings)) {
        showToast({ message: MIKE_THANKS_NOTE, tone: 'fun', durationMs: 5000, key: 'mike-thanks' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const duplicate = findDuplicateTransaction(draft, transactions)
    if (duplicate) {
      setPendingDuplicate(draft)
      return
    }
    await commitSave(draft)
  }

  if (settingsLoading || txLoading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="quick-entry-page">
      <form className="quick-entry-form" onSubmit={handleSubmit}>
        <div className="quick-entry-date-row">
          <label className="quick-entry-date">
            Tarih
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          {date !== todayISO() && (
            <button type="button" className="quick-entry-today" onClick={() => setDate(todayISO())}>
              Bugüne dön
            </button>
          )}
        </div>

        <input
          className="quick-entry-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="quick-entry-currency">EUR</span>

        {recentCategories.length > 0 && (
          <div className="quick-entry-chips">
            {recentCategories.map((c) => (
              <button
                type="button"
                key={c}
                className={c === category ? 'chip chip--active' : 'chip'}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <label>
          {recentCategories.length > 0 ? 'Diğer kategori' : 'Kategori'}
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
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
          Hesap
          <select value={account} onChange={(e) => setAccount(e.target.value)} required>
            {settings.accounts.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Açıklama (opsiyonel)
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        {pendingDuplicate && (
          <div className="expense-preview expense-preview--error">
            <span>
              Bugün aynı tutar ve kategoride bir kayıt zaten var gibi görünüyor. Yine de kaydedilsin
              mi?
            </span>
            <div className="expense-form-actions">
              <button type="button" onClick={() => commitSave(pendingDuplicate)} disabled={saving}>
                Yine de kaydet
              </button>
              <button type="button" onClick={() => setPendingDuplicate(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {!pendingDuplicate && category && amount && preview.validation !== 'OK' && preview.validation !== '' && (
          <div className="expense-preview expense-preview--error">
            <span>{preview.validation}</span>
          </div>
        )}

        {!pendingDuplicate && (
          <button type="submit" className="quick-entry-submit" disabled={!canSubmit || saving}>
            {savedFlash ? 'Kaydedildi ✓' : saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        )}
      </form>
    </div>
  )
}
