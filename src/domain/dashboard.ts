import type {
  Account,
  BudgetType,
  Category,
  CategoryBudgetType,
  Income,
  Settings,
  Transaction,
  Transfer,
} from './types'
import { computeTransaction } from './transactions'
import { computeIncome } from './incomes'
import { computeTransfer } from './transfers'
import { computeAccountBalances } from './balances'

// Bu dosya Ozet sayfasinin (Ay Panosu) birebir karsiligidir. "Seçili ay"
// disindaki her sey (Kontroller, Aylik Gelisim) tum zamanlari kapsar,
// Excel'de de oyle. docs/proje-talimatlari.md bolum 7'ye bakin.

export const BUDGET_TYPES_ORDER: BudgetType[] = [
  'Ortak-Ev',
  'Ortak-Dışarı',
  'Kişisel-Can',
  'Kişisel-Tuğçe',
  'Mike',
  'Taşınma',
]

export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1 - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// Ortak_Butce sayfasindaki gibi, bir kategorinin limiti sadece
// Ortak-Ev / Ortak-Dışarı / Mike tipinde anlamlidir; Kişisel limitler
// Faz 6'da Butce_Can/Butce_Tuğçe'den, Taşınma'nin limiti Excel'de de
// hep 0'dir (C12=0).
function budgetTypeLimitEUR(budgetType: BudgetType, categories: Category[]): number {
  if (budgetType === 'Kişisel-Can' || budgetType === 'Kişisel-Tuğçe' || budgetType === 'Taşınma') {
    return 0
  }
  return categories
    .filter((c) => c.budgetType === (budgetType as CategoryBudgetType))
    .reduce((sum, c) => sum + (c.monthlyLimitEUR ?? 0), 0)
}

function isKnownBudgetType(value: string): value is BudgetType {
  return (BUDGET_TYPES_ORDER as string[]).includes(value)
}

// Islemler!J icin geçerli (bilinen 6 butce tipine ait) tutarlarin
// toplami. "Paylaşım eksik" veya kategori bulunamadigi icin bos kalan
// satirlar, Excel'in SUMIFS'i gibi hiçbir butce tipi altina girmez.
function sumExpensesByMonth(
  transactions: ReturnType<typeof computeTransaction>[],
  monthKey: string,
  budgetType?: BudgetType,
): number {
  return transactions
    .filter((t) => t.monthKey === monthKey)
    .filter((t) => isKnownBudgetType(t.budgetType))
    .filter((t) => !budgetType || t.budgetType === budgetType)
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
}

export type BudgetTypeRow = {
  budgetType: BudgetType
  spentEUR: number
  limitEUR: number
  remainingEUR: number
  usagePct: number | undefined
  previousSpentEUR: number
  changeEUR: number
  sharePct: number | undefined
}

export function computeBudgetTypeSummary(
  monthKey: string,
  transactions: Transaction[],
  settings: Settings,
): BudgetTypeRow[] {
  const computed = transactions.map((t) => computeTransaction(t, settings))
  const prevMonthKey = previousMonthKey(monthKey)
  const totalSpent = sumExpensesByMonth(computed, monthKey)

  return BUDGET_TYPES_ORDER.map((budgetType) => {
    const spentEUR = sumExpensesByMonth(computed, monthKey, budgetType)
    const limitEUR = budgetTypeLimitEUR(budgetType, settings.categories)
    const previousSpentEUR = sumExpensesByMonth(computed, prevMonthKey, budgetType)

    return {
      budgetType,
      spentEUR,
      limitEUR,
      remainingEUR: limitEUR - spentEUR,
      usagePct: limitEUR === 0 ? undefined : spentEUR / limitEUR,
      previousSpentEUR,
      changeEUR: spentEUR - previousSpentEUR,
      sharePct: totalSpent === 0 ? undefined : spentEUR / totalSpent,
    }
  })
}

export type CategoryRow = {
  category: Category
  spentEUR: number
  sharePct: number | undefined
  previousSpentEUR: number
}

export function computeCategoryBreakdown(
  monthKey: string,
  transactions: Transaction[],
  settings: Settings,
): CategoryRow[] {
  const computed = transactions.map((t) => computeTransaction(t, settings))
  const prevMonthKey = previousMonthKey(monthKey)
  const totalSpent = sumExpensesByMonth(computed, monthKey)

  return settings.categories
    .map((category) => {
      const spentEUR = computed
        .filter((t) => t.monthKey === monthKey && t.category === category.name)
        .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
      const previousSpentEUR = computed
        .filter((t) => t.monthKey === prevMonthKey && t.category === category.name)
        .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
      return {
        category,
        spentEUR,
        sharePct: totalSpent === 0 ? undefined : spentEUR / totalSpent,
        previousSpentEUR,
      }
    })
    .filter((row) => row.spentEUR > 0 || row.previousSpentEUR > 0)
    .sort((a, b) => b.spentEUR - a.spentEUR)
}

export type MonthSummary = {
  totalIncomeEUR: number
  totalExpenseEUR: number
  savingsTransferredEUR: number
  netEUR: number
  nonMovingExpenseEUR: number
  savingsRatePct: number | undefined
}

export function computeMonthSummary(
  monthKey: string,
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): MonthSummary {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  const computedIncomes = incomes.map((i) => computeIncome(i, settings))
  const computedTransfers = transfers.map((t) => computeTransfer(t, settings))

  const totalIncomeEUR = computedIncomes
    .filter((i) => i.monthKey === monthKey)
    .reduce((sum, i) => sum + (i.amountEUR ?? 0), 0)

  const totalExpenseEUR = sumExpensesByMonth(computedTx, monthKey)
  const movingExpenseEUR = sumExpensesByMonth(computedTx, monthKey, 'Taşınma')

  const savingsTransferredEUR = computedTransfers
    .filter((t) => t.monthKey === monthKey && t.type === 'Tasarruf')
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)

  const netEUR = totalIncomeEUR - totalExpenseEUR - savingsTransferredEUR

  return {
    totalIncomeEUR,
    totalExpenseEUR,
    savingsTransferredEUR,
    netEUR,
    nonMovingExpenseEUR: totalExpenseEUR - movingExpenseEUR,
    savingsRatePct:
      totalIncomeEUR === 0 ? undefined : (netEUR + savingsTransferredEUR) / totalIncomeEUR,
  }
}

export type MonthlyProgressRow = {
  monthKey: string
  byBudgetType: Record<BudgetType, number>
  totalEUR: number
  incomeEUR: number
  netEUR: number
}

export function computeMonthlyProgress(
  transactions: Transaction[],
  incomes: Income[],
  settings: Settings,
): MonthlyProgressRow[] {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  const computedIncomes = incomes.map((i) => computeIncome(i, settings))

  const monthKeys = new Set<string>()
  computedTx.forEach((t) => t.monthKey && monthKeys.add(t.monthKey))
  computedIncomes.forEach((i) => i.monthKey && monthKeys.add(i.monthKey))

  return Array.from(monthKeys)
    .sort()
    .map((monthKey) => {
      const byBudgetType = Object.fromEntries(
        BUDGET_TYPES_ORDER.map((bt) => [bt, sumExpensesByMonth(computedTx, monthKey, bt)]),
      ) as Record<BudgetType, number>
      const totalEUR = sumExpensesByMonth(computedTx, monthKey)
      const incomeEUR = computedIncomes
        .filter((i) => i.monthKey === monthKey)
        .reduce((sum, i) => sum + (i.amountEUR ?? 0), 0)

      return { monthKey, byBudgetType, totalEUR, incomeEUR, netEUR: incomeEUR - totalEUR }
    })
}

export type ControlRow = {
  label: string
  ok: boolean
  message: string
}

const ORTAK_KASA = 'Ortak Kasa'

export function computeControls(
  accounts: Account[],
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): ControlRow[] {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  const computedTransfers = transfers.map((t) => computeTransfer(t, settings))

  const invalidTxCount = computedTx.filter(
    (t) => t.validation !== '' && t.validation !== 'OK',
  ).length
  const invalidTransferCount = computedTransfers.filter(
    (t) => t.validation !== '' && t.validation !== 'OK',
  ).length

  const tryMonthsWithoutRate = new Set(
    transactions
      .filter((t) => t.currency === 'TRY' && t.date)
      .map((t) => t.date.slice(0, 7))
      .filter((monthKey) => !(settings.rates[monthKey] > 0)),
  )

  const balances = computeAccountBalances(accounts, transactions, incomes, transfers, settings)
  const ortakKasa = balances.find((b) => b.account.name === ORTAK_KASA)
  const katkiToplamiEUR = computedTransfers
    .filter((t) => t.type === 'Ortak Kasa Katkısı')
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
  const ortakKasaDiff = ortakKasa
    ? Math.round(
        (ortakKasa.balanceEUR -
          ortakKasa.account.startingBalanceEUR -
          (katkiToplamiEUR - ortakKasa.expensesEUR)) *
          100,
      ) / 100
    : 0

  return [
    {
      label: 'Hatalı işlem satırı',
      ok: invalidTxCount === 0,
      message:
        invalidTxCount === 0
          ? 'OK'
          : `Harcamalar sayfasında ${invalidTxCount} hatalı satır var`,
    },
    {
      label: 'Hatalı transfer satırı',
      ok: invalidTransferCount === 0,
      message:
        invalidTransferCount === 0
          ? 'OK'
          : `Transferler sayfasında ${invalidTransferCount} hatalı satır var`,
    },
    {
      label: 'TL harcaması olup kuru girilmemiş ay',
      ok: tryMonthsWithoutRate.size === 0,
      message:
        tryMonthsWithoutRate.size === 0
          ? 'OK'
          : `Ayarlar sayfasında şu ayların kurunu girin: ${Array.from(tryMonthsWithoutRate).sort().join(', ')}`,
    },
    {
      label: 'Ortak Kasa bakiye farkı',
      ok: ortakKasaDiff === 0,
      message:
        ortakKasaDiff === 0
          ? 'OK'
          : 'Ortak Kasa harcamalarında Hesap ya da Transfer Hedef Hesap alanını kontrol edin',
    },
  ]
}
