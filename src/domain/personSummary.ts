import type { Income, Person, Settings, Transaction, Transfer } from './types'
import { computeTransaction, monthKeyOf } from './transactions'
import { computeIncome } from './incomes'
import { computeTransfer } from './transfers'
import { localISO } from './dates'

// Ana sayfadaki "Ortak / Can / Tuğçe" ozeti. Hicbir yeni is kurali
// getirmez: kisinin harcamasi, Islemler sayfasindaki "Can Payı" /
// "Tuğçe Payı" kolonlarinin (computeTransaction.canShare / tugceShare)
// ay bazinda toplamidir. Gelir, Gelirler sayfasindaki kisi alanina gore
// ayrilir. Yani ayni sayilar, yalnizca kisi kirilimiyla toplaniyor.

export type PersonScope = 'Ortak' | Person

export type ScopeSummary = {
  scope: PersonScope
  monthKey: string
  expenseEUR: number
  incomeEUR: number
  savingsEUR: number
  netEUR: number
  /** Bu ay bu kapsama giren kayit sayisi. */
  transactionCount: number
}

export function computeScopeSummary(
  scope: PersonScope,
  monthKey: string,
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): ScopeSummary {
  const monthTx = transactions
    .map((t) => computeTransaction(t, settings))
    .filter((t) => monthKeyOf(t.date) === monthKey)

  const monthIncomes = incomes
    .map((i) => computeIncome(i, settings))
    .filter((i) => monthKeyOf(i.date) === monthKey)

  const monthTransfers = transfers
    .map((t) => computeTransfer(t, settings))
    .filter((t) => monthKeyOf(t.date) === monthKey)

  let expenseEUR: number
  let incomeEUR: number
  let savingsEUR: number
  let transactionCount: number

  if (scope === 'Ortak') {
    expenseEUR = monthTx.reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
    incomeEUR = monthIncomes.reduce((sum, i) => sum + (i.amountEUR ?? 0), 0)
    savingsEUR = monthTransfers
      .filter((t) => t.type === 'Tasarruf')
      .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
    transactionCount = monthTx.length
  } else {
    const shareOf = (t: (typeof monthTx)[number]) =>
      (scope === 'Can' ? t.canShare : t.tugceShare) ?? 0
    expenseEUR = monthTx.reduce((sum, t) => sum + shareOf(t), 0)
    incomeEUR = monthIncomes
      .filter((i) => i.person === scope)
      .reduce((sum, i) => sum + (i.amountEUR ?? 0), 0)
    // Tasarruf transferi, cikis hesabinin sahibine gore kisiye yazilir.
    savingsEUR = monthTransfers
      .filter((t) => t.type === 'Tasarruf')
      .filter((t) => {
        const from = settings.accounts.find((a) => a.name === t.fromAccount)
        return from?.owner === scope
      })
      .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
    transactionCount = monthTx.filter((t) => shareOf(t) > 0).length
  }

  return {
    scope,
    monthKey,
    expenseEUR,
    incomeEUR,
    savingsEUR,
    netEUR: incomeEUR - expenseEUR - savingsEUR,
    transactionCount,
  }
}

/** Verilen gunun icinde bulundugu haftanin (Pazartesi baslangicli) ilk gunu. */
export function weekStartISO(today: Date): string {
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const dayOfWeek = (d.getUTCDay() + 6) % 7 // Pazartesi = 0
  d.setUTCDate(d.getUTCDate() - dayOfWeek)
  return d.toISOString().slice(0, 10)
}

export type WeekSummary = {
  fromISO: string
  toISO: string
  expenseEUR: number
  transactionCount: number
  /** Onceki haftanin ayni kapsamdaki harcamasi (karsilastirma icin). */
  previousExpenseEUR: number
}

/**
 * "Bu hafta" ozeti: Pazartesi'den bugune. Kapsam 'Ortak' ise tum
 * harcamalar, kisi ise o kisinin payi toplanir.
 */
export function computeWeekSummary(
  scope: PersonScope,
  transactions: Transaction[],
  settings: Settings,
  today: Date,
): WeekSummary {
  const fromISO = weekStartISO(today)
  const toISO = localISO(today)

  const prevStart = new Date(fromISO + 'T00:00:00Z')
  prevStart.setUTCDate(prevStart.getUTCDate() - 7)
  const prevFromISO = prevStart.toISOString().slice(0, 10)

  const computed = transactions.map((t) => computeTransaction(t, settings))
  const amountFor = (t: (typeof computed)[number]) =>
    scope === 'Ortak' ? (t.amountEUR ?? 0) : ((scope === 'Can' ? t.canShare : t.tugceShare) ?? 0)

  const thisWeek = computed.filter((t) => t.date >= fromISO && t.date <= toISO)
  const lastWeek = computed.filter((t) => t.date >= prevFromISO && t.date < fromISO)

  return {
    fromISO,
    toISO,
    expenseEUR: thisWeek.reduce((sum, t) => sum + amountFor(t), 0),
    transactionCount: thisWeek.filter((t) => amountFor(t) > 0).length,
    previousExpenseEUR: lastWeek.reduce((sum, t) => sum + amountFor(t), 0),
  }
}
