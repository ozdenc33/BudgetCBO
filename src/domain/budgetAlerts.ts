import type { AccountBalance } from './types'
import type { BudgetTypeRow } from './dashboard'

// Kategori limiti uyarilari. Yeni bir hesaplama getirmez: Ay Panosu'nun
// zaten hesapladigi "Kullanim %" degerini esiklere gore siniflandirir.
// Limit girilmemis (0) satirlar hic uyarmaz.

export const WARN_THRESHOLD = 0.8

export type BudgetAlertLevel = 'asildi' | 'yaklasti'

export type BudgetAlert = {
  budgetType: string
  level: BudgetAlertLevel
  spentEUR: number
  limitEUR: number
  usagePct: number
  /** Limit asildiysa asan tutar, yaklastiysa kalan tutar. */
  deltaEUR: number
}

export function computeBudgetAlerts(rows: BudgetTypeRow[]): BudgetAlert[] {
  return rows
    .filter((r) => r.limitEUR > 0 && r.usagePct != null && r.usagePct >= WARN_THRESHOLD)
    .map((r) => {
      const usagePct = r.usagePct ?? 0
      const over = usagePct > 1
      return {
        budgetType: r.budgetType,
        level: (over ? 'asildi' : 'yaklasti') as BudgetAlertLevel,
        spentEUR: r.spentEUR,
        limitEUR: r.limitEUR,
        usagePct,
        deltaEUR: over ? r.spentEUR - r.limitEUR : r.limitEUR - r.spentEUR,
      }
    })
    .sort((a, b) => b.usagePct - a.usagePct)
}

/**
 * Bakiyesi eksiye dusmus hesaplar. Ozellikle Ortak Kasa icin onemli:
 * katkilar harcamalari karsilamiyorsa buradan gorunur.
 */
export function findNegativeBalances(balances: AccountBalance[]): AccountBalance[] {
  return balances
    .filter((b) => b.balanceEUR < 0)
    .sort((a, b) => a.balanceEUR - b.balanceEUR)
}
