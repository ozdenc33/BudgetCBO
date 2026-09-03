import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { addTransaction } from '../lib/firestoreTransactions'
import { computeTransaction, PAYLAŞIM_EKSIK_MESSAGE } from '../domain/transactions'
import { findDuplicateTransaction } from '../domain/duplicates'
import { computeAccountBalances } from '../domain/balances'
import { AccountOptions } from '../components/AccountOptions'
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

/**
 * secondAccount yalnizca GERCEK bir bolusuk cekilis varsa yazilir (bkz.
 * ExpensesPage'deki ayni isimli fonksiyon — davranis burada da birebir
 * ayni olmali, ikisi de Transaction.secondAccount uzerinden calisir).
 */
function effectiveSecondAccount(splitAccounts: boolean, account: string, secondAccount: string) {
  if (!splitAccounts) return undefined
  if (!secondAccount || secondAccount === account) return undefined
  return secondAccount
}

export function QuickEntryPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes } = useIncomes()
  const { transfers } = useTransfers()

  const [date, setDate] = useState(todayISO)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [account, setAccount] = useState('')
  const [splitAccounts, setSplitAccounts] = useState(false)
  const [secondAccount, setSecondAccount] = useState('')
  const [canPct, setCanPct] = useState('')
  const [tugcePct, setTugcePct] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pendingDuplicate, setPendingDuplicate] = useState<TransactionDraft | null>(null)
  const [pendingImbalance, setPendingImbalance] = useState<TransactionDraft | null>(null)
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

  // Hesap secerken o an canlı bakiyeyi de gorebilmek icin.
  const accountBalances = useMemo(
    () => computeAccountBalances(settings.accounts, transactions, incomes, transfers, settings),
    [settings, transactions, incomes, transfers],
  )

  function buildDraft(): TransactionDraft {
    // Firestore addDoc "undefined" degerli alanlari reddeder; opsiyonel
    // alanlar bossa nesneye hic eklenmez.
    const draft: TransactionDraft = {
      date,
      description: description.trim(),
      category,
      amount: Number(amount),
      currency: 'EUR',
      account,
    }
    const second = effectiveSecondAccount(splitAccounts, account, secondAccount)
    if (second) draft.secondAccount = second
    if (canPct !== '') draft.canPct = Number(canPct) / 100
    if (tugcePct !== '') draft.tugcePct = Number(tugcePct) / 100
    return draft
  }

  const draft = buildDraft()

  const preview = useMemo(
    () => computeTransaction({ id: 'preview', ...draft }, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, amount, category, account, splitAccounts, secondAccount, canPct, tugcePct, settings],
  )

  // Ratio 0/1 (tek kisi) disinda bir yerdeyse gercek bir bolusum var
  // demektir — bu durumda "farkli hesaplardan ode" secenegi ve Can%/
  // Tuğçe% duzenleme alanlari gosterilir. Ratio 0 ya da 1 ise (biri
  // %100) bunlarin hicbiri gerekmez, hizli giris sade kalir.
  const isSplitRatio = preview.ratio != null && preview.ratio > 0 && preview.ratio < 1
  const isPaylaşımEksik = preview.validation === PAYLAŞIM_EKSIK_MESSAGE

  const canSubmit =
    amount !== '' &&
    category !== '' &&
    account !== '' &&
    (preview.validation === 'OK' || preview.validation === '' || isPaylaşımEksik)

  function setCanAccount(name: string) {
    // "Biri Ortak seçildiğinde diğeri de otomatik Ortak olsun."
    setAccount(name)
    if (name === 'Ortak Kasa') setSecondAccount('Ortak Kasa')
  }

  function setTugceAccount(name: string) {
    setSecondAccount(name)
    if (name === 'Ortak Kasa') setAccount('Ortak Kasa')
  }

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
      setSplitAccounts(false)
      setSecondAccount('')
      setCanPct('')
      setTugcePct('')
      setPendingDuplicate(null)
      setPendingImbalance(null)
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
    const finalDraft = buildDraft()
    const duplicate = findDuplicateTransaction(finalDraft, transactions)
    if (duplicate) {
      setPendingDuplicate(finalDraft)
      return
    }
    if (isPaylaşımEksik) {
      setPendingImbalance(finalDraft)
      return
    }
    await commitSave(finalDraft)
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
          {isSplitRatio && splitAccounts ? 'Hesap (Can payı)' : 'Hesap'}
          <select value={account} onChange={(e) => setCanAccount(e.target.value)} required>
            <AccountOptions accounts={settings.accounts} balances={accountBalances} />
          </select>
        </label>

        {isSplitRatio && (
          <>
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={splitAccounts}
                onChange={(e) => {
                  setSplitAccounts(e.target.checked)
                  setSecondAccount(e.target.checked ? account : '')
                }}
              />
              Farklı hesaplardan bölüşerek öde (örn. %{Math.round((preview.ratio ?? 0) * 100)} Can
              hesabından, %{Math.round((1 - (preview.ratio ?? 0)) * 100)} Tuğçe hesabından)
            </label>
            {splitAccounts && (
              <label>
                Hesap (Tuğçe payı)
                <select
                  value={secondAccount}
                  onChange={(e) => setTugceAccount(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Seçin
                  </option>
                  <AccountOptions accounts={settings.accounts} balances={accountBalances} />
                </select>
              </label>
            )}
            <div className="expense-form-row">
              <label>
                Can %
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="—"
                  value={canPct}
                  onChange={(e) => {
                    setCanPct(e.target.value)
                    setTugcePct('')
                  }}
                />
              </label>
              <label>
                Tuğçe %
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="—"
                  value={tugcePct}
                  onChange={(e) => {
                    setTugcePct(e.target.value)
                    setCanPct('')
                  }}
                />
              </label>
            </div>
          </>
        )}

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

        {pendingImbalance && (
          <div className="expense-preview expense-preview--error">
            <span>
              Bu kişisel bir kategori; normalde Can %100 ya da Tuğçe %100 olmalı. Yine de bu şekilde
              bölüşük kaydedilsin mi?
            </span>
            <div className="expense-form-actions">
              <button type="button" onClick={() => commitSave(pendingImbalance)} disabled={saving}>
                Yine de kaydet
              </button>
              <button type="button" onClick={() => setPendingImbalance(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {!pendingDuplicate &&
          !pendingImbalance &&
          category &&
          amount &&
          account &&
          (preview.validation === 'OK' || isPaylaşımEksik ? (
            <div className="expense-preview expense-preview--ok">
              <span>{preview.budgetType}</span>
              <span>
                Can {preview.canShare?.toFixed(2)} / Tuğçe {preview.tugceShare?.toFixed(2)}
              </span>
              {isPaylaşımEksik && <span>{PAYLAŞIM_EKSIK_MESSAGE}</span>}
            </div>
          ) : (
            <div className="expense-preview expense-preview--error">
              <span>{preview.validation}</span>
            </div>
          ))}

        {!pendingDuplicate && !pendingImbalance && (
          <button type="submit" className="quick-entry-submit" disabled={!canSubmit || saving}>
            {savedFlash ? 'Kaydedildi ✓' : saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        )}
      </form>
    </div>
  )
}
