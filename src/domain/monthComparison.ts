import type { BudgetType, Income, Settings, Transaction, Transfer } from './types'
import {
  BUDGET_TYPES_ORDER,
  computeCategoryBreakdown,
  computeMonthSummary,
  previousMonthKey,
  type MonthSummary,
} from './dashboard'

/**
 * Ay kapanisi ozeti: secili ayi bir onceki ayla karsilastirir.
 *
 * Yeni bir is kurali getirmez — Ay Panosu'nun zaten hesapladigi ayni
 * degerleri kullanir (computeCategoryBreakdown her satirda onceki ayin
 * tutarini da veriyor) ve farklarini alir. Amaci "bu ay nasil gecti"
 * sorusuna tek bakista cevap vermek: hangi kalem artti, hangisi azaldi.
 */

export type MonthDelta = {
  currentEUR: number
  previousEUR: number
  deltaEUR: number
  /**
   * Yuzdesel degisim. Onceki ay 0 VEYA NEGATIF ise tanimsizdir.
   *
   * NEDEN negatif taban da disarida: Net -60 €'dan -20,40 €'ya
   * iyilesince fark +39,60 € olur, ama -60'a bolununce -%66 cikar —
   * yani iyilesme kotulesme gibi gorunur. Boyle bir durumda yalnizca
   * euro farki gosterilir.
   */
  deltaPct: number | undefined
}

export type CategoryDelta = MonthDelta & { category: string }

export type BudgetTypeDelta = MonthDelta & { budgetType: BudgetType }

export type MonthComparison = {
  monthKey: string
  previousMonthKey: string
  current: MonthSummary
  previous: MonthSummary
  expense: MonthDelta
  income: MonthDelta
  savings: MonthDelta
  net: MonthDelta
  byBudgetType: BudgetTypeDelta[]
  /** Onceki aya gore en cok ARTAN kategoriler (buyukten kucuge). */
  biggestIncreases: CategoryDelta[]
  /** Onceki aya gore en cok AZALAN kategoriler (buyukten kucuge). */
  biggestDecreases: CategoryDelta[]
}

function delta(currentEUR: number, previousEUR: number): MonthDelta {
  const deltaEUR = currentEUR - previousEUR
  return {
    currentEUR,
    previousEUR,
    deltaEUR,
    deltaPct: previousEUR > 0 ? deltaEUR / previousEUR : undefined,
  }
}

const MAX_MOVERS = 3

export function computeMonthComparison(
  monthKey: string,
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): MonthComparison {
  const current = computeMonthSummary(monthKey, transactions, incomes, transfers, settings)
  const previous = computeMonthSummary(
    previousMonthKey(monthKey),
    transactions,
    incomes,
    transfers,
    settings,
  )

  const rows = computeCategoryBreakdown(monthKey, transactions, settings)

  const categoryDeltas: CategoryDelta[] = rows.map((row) => ({
    category: row.category.name,
    ...delta(row.spentEUR, row.previousSpentEUR),
  }))

  const byBudgetType: BudgetTypeDelta[] = BUDGET_TYPES_ORDER.map((budgetType) => {
    const inType = rows.filter((r) => r.category.budgetType === budgetType)
    return {
      budgetType,
      ...delta(
        inType.reduce((sum, r) => sum + r.spentEUR, 0),
        inType.reduce((sum, r) => sum + r.previousSpentEUR, 0),
      ),
    }
  })

  return {
    monthKey,
    previousMonthKey: previousMonthKey(monthKey),
    current,
    previous,
    expense: delta(current.totalExpenseEUR, previous.totalExpenseEUR),
    income: delta(current.totalIncomeEUR, previous.totalIncomeEUR),
    savings: delta(current.savingsTransferredEUR, previous.savingsTransferredEUR),
    net: delta(current.netEUR, previous.netEUR),
    byBudgetType,
    biggestIncreases: categoryDeltas
      .filter((d) => d.deltaEUR > 0)
      .sort((a, b) => b.deltaEUR - a.deltaEUR)
      .slice(0, MAX_MOVERS),
    biggestDecreases: categoryDeltas
      .filter((d) => d.deltaEUR < 0)
      .sort((a, b) => a.deltaEUR - b.deltaEUR)
      .slice(0, MAX_MOVERS),
  }
}
