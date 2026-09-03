import type { Income, Settings, Transaction, Transfer } from './types'
import { computeTransaction } from './transactions'
import { computeIncome } from './incomes'
import { computeTransfer } from './transfers'

// Bir hesabin hareket dokumu (ekstre). Yeni bir is kurali yok: Hesap
// Bakiyeleri sayfasindaki toplamlarin hangi kayitlardan olustugunu
// satir satir gosterir. Yurutulen bakiye, balances.ts'teki formulle
// ayni yonde ilerler: gelir +, harcama -, transfer cikis -, giris +.

export type LedgerKind = 'harcama' | 'gelir' | 'transfer-giris' | 'transfer-cikis'

export type LedgerRow = {
  id: string
  date: string
  kind: LedgerKind
  /** Satirin ana metni (aciklama / gelir kaynagi / transfer hedefi). */
  label: string
  /** Ikincil bilgi (kategori, butce tipi, transfer tipi). */
  detail: string
  /** Isaretli tutar: hesaba giren +, cikan -. */
  amountEUR: number
  /** Bu satirdan sonraki bakiye. */
  balanceAfterEUR: number
}

export function computeAccountLedger(
  accountName: string,
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): LedgerRow[] {
  const rows: Omit<LedgerRow, 'balanceAfterEUR'>[] = []

  for (const raw of transactions) {
    const t = computeTransaction(raw, settings)
    if (t.account !== accountName) continue
    rows.push({
      id: `tx-${t.id}`,
      date: t.date,
      kind: 'harcama',
      label: t.description || t.category,
      detail: t.category,
      amountEUR: -(t.amountEUR ?? 0),
    })
  }

  for (const raw of incomes) {
    const i = computeIncome(raw, settings)
    if (i.account !== accountName) continue
    rows.push({
      id: `in-${i.id}`,
      date: i.date,
      kind: 'gelir',
      label: i.source,
      detail: i.person,
      amountEUR: i.amountEUR ?? 0,
    })
  }

  for (const raw of transfers) {
    const t = computeTransfer(raw, settings)
    if (t.fromAccount === accountName) {
      rows.push({
        id: `tr-out-${t.id}`,
        date: t.date,
        kind: 'transfer-cikis',
        label: t.to || t.toAccount,
        detail: t.type,
        amountEUR: -(t.amountEUR ?? 0),
      })
    }
    if (t.toAccount === accountName) {
      rows.push({
        id: `tr-in-${t.id}`,
        date: t.date,
        kind: 'transfer-giris',
        label: t.from || t.fromAccount,
        detail: t.type,
        amountEUR: t.amountEUR ?? 0,
      })
    }
  }

  // Once eskiden yeniye siralayip yurutulen bakiyeyi hesapla.
  rows.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))
  let running = 0
  const withBalance: LedgerRow[] = rows.map((r) => {
    running += r.amountEUR
    return { ...r, balanceAfterEUR: running }
  })

  // Ekranda en yeni ustte olsun.
  return withBalance.reverse()
}

// --- Tasarruf hesaplarinin hedef bazli kirilimi ---

export type SavingsContribution = {
  /** Parayi gonderen kisi (transferin "Gonderen" alani). */
  person: string
  amountEUR: number
}

export type SavingsGoalRow = {
  goalName: string
  totalEUR: number
  contributions: SavingsContribution[]
}

export type SavingsBreakdown = {
  /** Hedeflere atanmis toplam. */
  assignedEUR: number
  /** Hesap bakiyesinin hedefe atanmamis kismi. */
  unassignedEUR: number
  goals: SavingsGoalRow[]
}

/**
 * "Can-Tasarruf'ta 4.000 € var ama ne icin?" sorusunun cevabi: bu hesaba
 * gelen Tasarruf transferlerini hedefe ve gonderen kisiye gore kirar.
 * Hedefe atanmamis bakiye ayrica gosterilir.
 */
export function computeSavingsBreakdown(
  accountName: string,
  transfers: Transfer[],
  settings: Settings,
  accountBalanceEUR: number,
): SavingsBreakdown {
  const incoming = transfers
    .map((t) => computeTransfer(t, settings))
    .filter((t) => t.toAccount === accountName && t.type === 'Tasarruf' && t.to)

  const byGoal = new Map<string, Map<string, number>>()
  for (const t of incoming) {
    const goal = byGoal.get(t.to) ?? new Map<string, number>()
    const person = t.from || '—'
    goal.set(person, (goal.get(person) ?? 0) + (t.amountEUR ?? 0))
    byGoal.set(t.to, goal)
  }

  const goals: SavingsGoalRow[] = [...byGoal.entries()]
    .map(([goalName, people]) => ({
      goalName,
      totalEUR: [...people.values()].reduce((sum, v) => sum + v, 0),
      contributions: [...people.entries()]
        .map(([person, amountEUR]) => ({ person, amountEUR }))
        .sort((a, b) => b.amountEUR - a.amountEUR),
    }))
    .sort((a, b) => b.totalEUR - a.totalEUR)

  const assignedEUR = goals.reduce((sum, g) => sum + g.totalEUR, 0)

  return {
    assignedEUR,
    unassignedEUR: accountBalanceEUR - assignedEUR,
    goals,
  }
}
