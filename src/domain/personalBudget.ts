import type {
  ComputedPersonalBudget,
  Income,
  Person,
  PersonalBudgetIncomeRow,
  PersonalBudgetPlan,
  PersonalCategoryRow,
  RecurringItem,
  Settings,
  Transaction,
  Transfer,
} from './types'
import { computeTransaction } from './transactions'
import { computeIncome } from './incomes'
import { computeTransfer } from './transfers'
import { monthlyEquivalentEUR } from './recurring'

// Bu dosya Butce_Can / Butce_Tugce sayfalarinin birebir karsiligidir.
// Plan (sari) hucreler settings.personalPlans icinde saklanir, Excel'de
// oldugu gibi aya gore degismez. "Gerçekleşen" her zaman secili ay icin
// canli hesaplanir. Isaret kurallari (Fark = aktif-plan mi, plan-aktif
// mi) Excel'in kendi formulleriyle BIREBIR aynidir; bolum 2/3 (Kalan) ve
// bolum 5/SONUÇ (Fark) arasinda Excel'de bilerek/bilmeyerek farkli
// isaret kullanilir — bkz. testler.

function budgetTypeForPerson(person: Person): 'Kişisel-Can' | 'Kişisel-Tuğçe' {
  return person === 'Can' ? 'Kişisel-Can' : 'Kişisel-Tuğçe'
}

function currentMonthKey(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function remainingDaysInMonth(monthKey: string, today: Date): number | undefined {
  if (currentMonthKey(today) !== monthKey) return undefined
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return daysInMonth - today.getDate()
}

export function computePersonalBudget(
  person: Person,
  monthKey: string,
  plan: PersonalBudgetPlan,
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  recurring: RecurringItem[],
  settings: Settings,
  today: Date,
): ComputedPersonalBudget {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  const computedIncomes = incomes.map((i) => computeIncome(i, settings))
  const computedTransfers = transfers.map((t) => computeTransfer(t, settings))
  const personalBudgetType = budgetTypeForPerson(person)

  // 1. GELIR
  const incomeRows: PersonalBudgetIncomeRow[] = settings.incomeSources.map((source) => {
    const plannedEUR = plan.incomePlan[source.name] ?? 0
    const actualEUR = computedIncomes
      .filter((i) => i.monthKey === monthKey && i.person === person && i.source === source.name)
      .reduce((sum, i) => sum + (i.amountEUR ?? 0), 0)
    return {
      source: source.name,
      plannedEUR,
      actualEUR,
      diffEUR: actualEUR - plannedEUR,
      usagePct: plannedEUR === 0 ? undefined : actualEUR / plannedEUR,
    }
  })
  const incomePlannedEUR = incomeRows.reduce((s, r) => s + r.plannedEUR, 0)
  const incomeActualEUR = incomeRows.reduce((s, r) => s + r.actualEUR, 0)

  // 2. ORTAK HARCAMALARDAKI PAYI
  const shareColumn = person === 'Can' ? 'canShare' : 'tugceShare'
  const totalShareEUR = computedTx
    .filter((t) => t.monthKey === monthKey)
    .reduce((sum, t) => sum + (t[shareColumn] ?? 0), 0)
  const ownPersonalSpendEUR = computedTx
    .filter((t) => t.monthKey === monthKey && t.budgetType === personalBudgetType)
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
  const sharedActualEUR = totalShareEUR - ownPersonalSpendEUR
  const sharedPlannedEUR = plan.sharedContributionPlanEUR

  const activeFixedMonthlyEUR = (types: string[]) =>
    recurring
      // kind='income' kalemlerin budgetType'i yok, dogal olarak elenir.
      .filter((r) => r.active && r.budgetType != null && (types as string[]).includes(r.budgetType))
      .reduce((sum, r) => sum + (monthlyEquivalentEUR(r) ?? 0), 0)
  const sharedFixedMonthlyEUR = activeFixedMonthlyEUR(['Ortak-Ev', 'Mike'])
  const sharedCategoryLimitTotalEUR = settings.categories
    .filter(
      (c) =>
        c.budgetType === 'Ortak-Ev' || c.budgetType === 'Ortak-Dışarı' || c.budgetType === 'Mike',
    )
    .reduce((sum, c) => sum + (c.monthlyLimitEUR ?? 0), 0)

  // 3. KISISEL HARCAMALAR
  const personalCategories = settings.categories.filter((c) => c.budgetType === 'Kişisel')
  const categoryRows: PersonalCategoryRow[] = personalCategories.map((category) => {
    const plannedEUR = plan.categoryPlan[category.name]
    const actualEUR = computedTx
      .filter(
        (t) =>
          t.monthKey === monthKey &&
          t.budgetType === personalBudgetType &&
          t.category === category.name,
      )
      .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
    return {
      category: category.name,
      plannedEUR: plannedEUR ?? 0,
      actualEUR,
      remainingEUR: plannedEUR == null ? undefined : plannedEUR - actualEUR,
      usagePct: plannedEUR == null || plannedEUR === 0 ? undefined : actualEUR / plannedEUR,
    }
  })
  const categoriesPlannedEUR = categoryRows.reduce((s, r) => s + r.plannedEUR, 0)
  const categoriesActualEUR = categoryRows.reduce((s, r) => s + r.actualEUR, 0)
  const personalFixedMonthlyEquivalentEUR = activeFixedMonthlyEUR([personalBudgetType])

  // 4. TASARRUF
  const savingsPlannedEUR = plan.savingsPlanEUR
  const savingsActualEUR = computedTransfers
    .filter((t) => t.monthKey === monthKey && t.type === 'Tasarruf' && t.from === person)
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)

  // 5. SONUÇ
  const netPlannedEUR =
    incomePlannedEUR - sharedPlannedEUR - categoriesPlannedEUR - savingsPlannedEUR
  const netActualEUR = incomeActualEUR - sharedActualEUR - categoriesActualEUR - savingsActualEUR

  const unassignedStatus =
    netPlannedEUR > 0.005 ? 'dagitilmadi' : netPlannedEUR < -0.005 ? 'asildi' : 'tamam'

  const spendableThisMonthEUR =
    incomePlannedEUR === 0
      ? undefined
      : incomePlannedEUR - sharedActualEUR - categoriesActualEUR - savingsActualEUR

  const remainingDays = remainingDaysInMonth(monthKey, today)
  const dailySpendableEUR =
    spendableThisMonthEUR == null || !remainingDays
      ? undefined
      : spendableThisMonthEUR / remainingDays

  return {
    person,
    monthKey,
    remainingDaysInMonth: remainingDays,
    income: {
      rows: incomeRows,
      plannedEUR: incomePlannedEUR,
      actualEUR: incomeActualEUR,
      diffEUR: incomeActualEUR - incomePlannedEUR,
      usagePct: incomePlannedEUR === 0 ? undefined : incomeActualEUR / incomePlannedEUR,
    },
    sharedContribution: {
      plannedEUR: sharedPlannedEUR,
      actualEUR: sharedActualEUR,
      remainingEUR: sharedPlannedEUR - sharedActualEUR,
      usagePct: sharedPlannedEUR === 0 ? undefined : sharedActualEUR / sharedPlannedEUR,
      suggestionHalfFixedEUR: sharedFixedMonthlyEUR / 2,
      suggestionHalfCategoryLimitEUR: sharedCategoryLimitTotalEUR / 2,
    },
    personalCategories: {
      rows: categoryRows,
      plannedEUR: categoriesPlannedEUR,
      actualEUR: categoriesActualEUR,
      remainingEUR: categoriesPlannedEUR - categoriesActualEUR,
      usagePct: categoriesPlannedEUR === 0 ? undefined : categoriesActualEUR / categoriesPlannedEUR,
    },
    personalFixedMonthlyEquivalentEUR,
    savings: {
      plannedEUR: savingsPlannedEUR,
      actualEUR: savingsActualEUR,
      diffEUR: savingsActualEUR - savingsPlannedEUR,
      usagePct: savingsPlannedEUR === 0 ? undefined : savingsActualEUR / savingsPlannedEUR,
    },
    summary: {
      incomeDiffEUR: incomeActualEUR - incomePlannedEUR,
      sharedContributionDiffEUR: sharedActualEUR - sharedPlannedEUR,
      personalCategoriesDiffEUR: categoriesActualEUR - categoriesPlannedEUR,
      savingsDiffEUR: savingsActualEUR - savingsPlannedEUR,
      netPlannedEUR,
      netActualEUR,
      netDiffEUR: netActualEUR - netPlannedEUR,
    },
    unassignedStatus,
    spendableThisMonthEUR,
    dailySpendableEUR,
    savingsRatePct: incomeActualEUR === 0 ? undefined : savingsActualEUR / incomeActualEUR,
  }
}
