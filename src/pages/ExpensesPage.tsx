import { useMemo, useState, type FormEvent } from 'react'
import { deleteField, type UpdateData } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { useToday } from '../hooks/useToday'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { addTransaction, deleteTransaction, updateTransaction } from '../lib/firestoreTransactions'
import { saveSettings } from '../lib/firestoreSettings'
import { fetchEurTryRateForDate } from '../lib/fetchRate'
import { personForEmail } from '../lib/currentPerson'
import { computeTransaction, findAccount, PAYLAŞIM_EKSIK_MESSAGE } from '../domain/transactions'
import { findDuplicateTransaction } from '../domain/duplicates'
import { filterTransactions, sumFilteredEUR, type TransactionFilter } from '../domain/filters'
import { isFutureDated } from '../domain/futureDated'
import { computeAccountBalances } from '../domain/balances'
import { isNoteVisibleTo } from '../domain/notePrivacy'
import { defaultAccountsForCategory } from '../domain/expenseDefaults'
import { TransactionFilters } from '../components/TransactionFilters'
import { AccountOptions } from '../components/AccountOptions'
import { OwnerBadge } from '../components/OwnerBadge'
import type {
  ComputedTransaction,
  Currency,
  Person,
  Settings,
  Transaction,
  TransactionDraft,
} from '../domain/types'
import { todayISO, todayMonthKey } from '../domain/dates'
import { MIKE_THANKS_NOTE, isMikeExpense } from '../domain/personalNotes'
import { useWrite } from '../hooks/useWrite'
import { useComputedTransactions } from '../hooks/useComputedTransactions'
import { useEditParam } from '../hooks/useEditParam'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { useToast } from '../components/ToastProvider'

type FormState = {
  date: string
  description: string
  category: string
  amount: string
  currency: Currency
  account: string
  /** Genuinely iki hesaptan bolusuk cekilis istendiginde acilir. */
  splitAccounts: boolean
  /** Tuğçe'nin hesabi (bkz. Transaction.secondAccount) — splitAccounts acikken kullanilir. */
  secondAccount: string
  canPct: string
  tugcePct: string
  tag: string
  note: string
  /** Baskasinin kisisel harcamasi duzenlenirken not gizlenir (bkz. notePrivacy.ts). */
  noteHidden: boolean
}

function emptyForm(): FormState {
  return {
    date: todayISO(),
    description: '',
    category: '',
    amount: '',
    currency: 'EUR',
    account: '',
    splitAccounts: false,
    secondAccount: '',
    canPct: '',
    tugcePct: '',
    tag: '',
    note: '',
    noteHidden: false,
  }
}

/**
 * secondAccount yalnizca GERCEK bir bolusuk cekilis varsa yazilir:
 * kullanici acikca "farkli hesaplardan" secmis VE iki hesap birbirinden
 * farkliysa. Aksi halde (toggle kapali, ya da ikisi de ayni — orn.
 * ikisi de "Ortak Kasa") eski tek hesapli kayit sekli korunur.
 */
function effectiveSecondAccount(form: FormState): string | undefined {
  if (!form.splitAccounts) return undefined
  if (!form.secondAccount || form.secondAccount === form.account) return undefined
  return form.secondAccount
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
  const secondAccount = effectiveSecondAccount(form)
  if (secondAccount) draft.secondAccount = secondAccount
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
  const secondAccount = effectiveSecondAccount(form)
  return {
    date: form.date,
    description: form.description.trim(),
    category: form.category,
    amount: Number(form.amount),
    currency: form.currency,
    account: form.account,
    secondAccount: secondAccount ?? deleteField(),
    canPct: form.canPct === '' ? deleteField() : Number(form.canPct) / 100,
    tugcePct: form.tugcePct === '' ? deleteField() : Number(form.tugcePct) / 100,
    tag: form.tag.trim() ? form.tag.trim() : deleteField(),
    // Not gizliyse (baskasinin kisisel harcamasi) alana hic dokunulmaz —
    // deleteField() bile gonderilmez, cunku bu asil notu SILER. Anahtar
    // nesneye hic eklenmeyince Firestore mevcut degeri korur.
    ...(form.noteHidden ? {} : { note: form.note.trim() ? form.note.trim() : deleteField() }),
  }
}

function transactionToForm(
  tx: Transaction,
  settings: Settings,
  currentPerson: Person | undefined,
): FormState {
  const computed = computeTransaction(tx, settings)
  const noteHidden = !isNoteVisibleTo(computed, currentPerson)
  return {
    date: tx.date,
    description: tx.description,
    category: tx.category,
    amount: String(tx.amount),
    currency: (tx.currency || 'EUR') as Currency,
    account: tx.account,
    splitAccounts: Boolean(tx.secondAccount && tx.secondAccount !== tx.account),
    secondAccount: tx.secondAccount ?? '',
    canPct: tx.canPct != null ? String(Math.round(tx.canPct * 100)) : '',
    tugcePct: tx.tugcePct != null ? String(Math.round(tx.tugcePct * 100)) : '',
    tag: tx.tag ?? '',
    note: noteHidden ? '' : (tx.note ?? ''),
    noteHidden,
  }
}

export function ExpensesPage() {
  const { user } = useAuth()
  const currentPerson = personForEmail(user?.email)
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes } = useIncomes()
  const { transfers } = useTransfers()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<TransactionFilter>(() => ({
    monthKey: todayMonthKey(),
  }))
  const [saving, setSaving] = useState(false)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [rateFetchNote, setRateFetchNote] = useState<string | null>(null)
  const today = useToday()
  const runWrite = useWrite()
  const { showToast } = useToast()
  const computedTransactions = useComputedTransactions()

  // Hesap secerken o an canlı bakiyeyi de gorebilmek icin.
  const accountBalances = useMemo(
    () => computeAccountBalances(settings.accounts, transactions, incomes, transfers, settings),
    [settings, transactions, incomes, transfers],
  )

  const preview = useMemo(
    () => computeTransaction({ id: 'preview', ...formToDraft(form) }, settings),
    [form, settings],
  )

  // Ratio 0/1 (tek kisi) disinda bir yerdeyse gercek bir bolusum var
  // demektir — bu durumda "farkli hesaplardan ode" secenegi sunulur.
  // Ratio 0 veya 1 ise (Birisi %100) diger hesabi secmeye hic gerek yok.
  const isSplitRatio = preview.ratio != null && preview.ratio > 0 && preview.ratio < 1
  const isPaylaşımEksik = preview.validation === PAYLAŞIM_EKSIK_MESSAGE

  const visibleTransactions = useMemo(
    () =>
      filterTransactions(computedTransactions, filter, currentPerson).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [computedTransactions, filter, currentPerson],
  )

  const visibleTotalEUR = useMemo(() => sumFilteredEUR(visibleTransactions), [visibleTransactions])

  const canSubmit =
    form.category !== '' &&
    form.amount !== '' &&
    form.account !== '' &&
    (preview.validation === 'OK' || preview.validation === '' || isPaylaşımEksik)

  function setCanAccount(name: string) {
    // "Biri Ortak seçildiğinde diğeri de otomatik Ortak olsun."
    setForm((f) => ({
      ...f,
      account: name,
      secondAccount: name === 'Ortak Kasa' ? 'Ortak Kasa' : f.secondAccount,
    }))
  }

  function setTugceAccount(name: string) {
    setForm((f) => ({
      ...f,
      secondAccount: name,
      account: name === 'Ortak Kasa' ? 'Ortak Kasa' : f.account,
    }))
  }

  async function handleFetchRateForDate() {
    if (!form.date) return
    setFetchingRate(true)
    setRateFetchNote(null)
    try {
      const { rate, date } = await fetchEurTryRateForDate(form.date)
      const monthKey = form.date.slice(0, 7)
      const ok = await runWrite(
        saveSettings({ ...settings, rates: { ...settings.rates, [monthKey]: rate } }),
        {
          failureMessage: 'Kur kaydedilemedi',
          successMessage: `${monthKey} kuru kaydedildi: 1 EUR = ${rate} TRY`,
        },
      )
      if (ok) {
        setRateFetchNote(
          `Kaydedildi: 1 EUR = ${rate} TRY${date ? ` (${date} tarihli ECB kuru)` : ''}.`,
        )
      }
    } catch (err) {
      setRateFetchNote(
        `Kur getirilemedi: ${err instanceof Error ? err.message : String(err)}. Elle girebilirsiniz (Ayarlar).`,
      )
    } finally {
      setFetchingRate(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (!editingId) {
      const duplicate = findDuplicateTransaction(formToDraft(form), transactions)
      if (duplicate) {
        const label = duplicate.description || duplicate.category
        if (
          !window.confirm(
            `${form.date} tarihinde, aynı tutar ve kategoride "${label}" adlı bir kayıt zaten var. Yine de kaydedilsin mi?`,
          )
        ) {
          return
        }
      }
    }
    if (isPaylaşımEksik) {
      const canPctDisplay =
        form.canPct !== ''
          ? form.canPct
          : form.tugcePct !== ''
            ? String(100 - Number(form.tugcePct))
            : '50'
      const tugcePctDisplay = String(100 - Number(canPctDisplay))
      if (
        !window.confirm(
          `Bu kişisel bir kategori; normalde Can %100 ya da Tuğçe %100 olmalı. Şu an Can %${canPctDisplay} / Tuğçe %${tugcePctDisplay} olarak bölüşük. Yine de bu şekilde kaydedilsin mi?`,
        )
      ) {
        return
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
    setForm(transactionToForm(tx, settings, currentPerson))
  }

  // Hesap Hareketleri'nden "?edit=<id>" ile gelindiyse formu otomatik ac.
  useEditParam(transactions, txLoading, startEdit)

  // "Tekrarla": ayni kayittan bugune yenisini hazirlar (kaydetmez, form
  // acilir ki tutari degistirebilesin).
  function repeat(tx: Transaction) {
    setEditingId(null)
    setFormOpen(true)
    // Yeni bir kayit olusturuluyor (guncelleme degil): not alani daima
    // duzenlenebilir kalir — baskasinin gizli notu asla kopyalanmaz
    // (transactionToForm zaten bos birakir), ama yeni not eklenebilir.
    setForm({
      ...transactionToForm(tx, settings, currentPerson),
      date: todayISO(),
      noteHidden: false,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  /**
   * Silme artik onay penceresi sormaz; bunun yerine kaydi silip 6
   * saniyelik "Geri al" sunar. Mobilde her silmede cikan
   * window.confirm'den hem daha hizli hem daha affedici — yanlislikla
   * silinen kayit tek dokunusla geri gelir.
   */
  async function handleDelete(tx: ComputedTransaction) {
    const label = tx.description || tx.category
    // Kaydin icerigi silinmeden once kopyalanir; geri alma bunu
    // yeni bir dokuman olarak tekrar yazar (eski id korunmaz).
    const { id: _id, ...draft } = tx
    const restore: TransactionDraft = {
      date: draft.date,
      description: draft.description,
      category: draft.category,
      amount: draft.amount,
      currency: draft.currency,
      account: draft.account,
    }
    if (draft.secondAccount) restore.secondAccount = draft.secondAccount
    if (draft.canPct != null) restore.canPct = draft.canPct
    if (draft.tugcePct != null) restore.tugcePct = draft.tugcePct
    if (draft.tag) restore.tag = draft.tag
    if (draft.note) restore.note = draft.note

    await runWrite(deleteTransaction(tx.id), {
      failureMessage: 'Harcama silinemedi',
      successMessage: `"${label}" silindi`,
      undo: {
        label: 'Geri al',
        onUndo: () => {
          void runWrite(addTransaction(restore), {
            failureMessage: 'Harcama geri alınamadı',
            successMessage: 'Harcama geri alındı',
          })
        },
      },
    })
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
              onChange={(e) => {
                const category = e.target.value
                const defaults = defaultAccountsForCategory(category, settings, currentPerson)
                setForm((f) => ({ ...f, category, ...defaults }))
              }}
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
          {form.category && preview.ratio != null && (
            <p className="settings-note">
              Can %{Math.round(preview.ratio * 100)} / Tuğçe %
              {Math.round((1 - preview.ratio) * 100)}
            </p>
          )}
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

          {isSplitRatio && (
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={form.splitAccounts}
                onChange={(e) =>
                  setForm({
                    ...form,
                    splitAccounts: e.target.checked,
                    secondAccount: e.target.checked ? form.account : '',
                  })
                }
              />
              Farklı hesaplardan bölüşerek öde (örn. %{Math.round((preview.ratio ?? 0) * 100)} Can
              hesabından, %{Math.round((1 - (preview.ratio ?? 0)) * 100)} Tuğçe hesabından)
            </label>
          )}

          <label>
            {isSplitRatio && form.splitAccounts ? 'Hesap (Can payı)' : 'Hesap'}
            <select value={form.account} onChange={(e) => setCanAccount(e.target.value)} required>
              <option value="" disabled>
                Seçin
              </option>
              <AccountOptions accounts={settings.accounts} balances={accountBalances} />
            </select>
          </label>

          {isSplitRatio && form.splitAccounts && (
            <label>
              Hesap (Tuğçe payı)
              <select value={form.secondAccount} onChange={(e) => setTugceAccount(e.target.value)}>
                <option value="" disabled>
                  Seçin
                </option>
                <AccountOptions accounts={settings.accounts} balances={accountBalances} />
              </select>
            </label>
          )}

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
          {form.account === 'Ortak Kasa' && form.canPct === '' && form.tugcePct === '' && (
            <p className="settings-note">
              Ortak Kasa: varsayılan %50 / %50 (değiştirmek için yukarı yazın).
            </p>
          )}
          <label>
            Etiket
            <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
          </label>
          {form.noteHidden ? (
            <p className="settings-note">
              Bu kişisel harcamanın notu yalnızca harcamayı yapan kişiye görünür.
            </p>
          ) : (
            <label>
              Not
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
          )}

          {form.category && form.amount && form.account && (
            <div
              className={
                preview.validation === 'OK' || isPaylaşımEksik
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
              <button type="button" onClick={handleFetchRateForDate} disabled={fetchingRate}>
                {fetchingRate ? 'Getiriliyor...' : 'Kur otomatik çek'}
              </button>
            </div>
          )}
          {rateFetchNote && <p className="settings-note">{rateFetchNote}</p>}

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
                <span>
                  <OwnerBadge owner={t.payer || undefined} /> {t.account}
                  {t.secondAccount && t.secondAccount !== t.account && (
                    <>
                      {' + '}
                      <OwnerBadge owner={findAccount(t.secondAccount, settings)?.owner} />{' '}
                      {t.secondAccount}
                    </>
                  )}
                </span>
                <span>{t.budgetType}</span>
                <span
                  className={
                    t.validation === 'OK' ? 'expense-badge expense-badge--ok' : 'expense-badge'
                  }
                >
                  {t.validation}
                </span>
                {t.note && isNoteVisibleTo(t, currentPerson) && (
                  <span className="expense-row-note" title="Not">
                    📝 {t.note}
                  </span>
                )}
                {t.rateWarning && (
                  <span className="expense-badge expense-badge--warning" title={t.rateWarning}>
                    kur eksik
                  </span>
                )}
              </div>
              <div className="expense-row-actions">
                <button onClick={() => startEdit(t)}>Düzenle</button>
                <button onClick={() => repeat(t)}>Tekrarla</button>
                <button onClick={() => handleDelete(t)}>Sil</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
