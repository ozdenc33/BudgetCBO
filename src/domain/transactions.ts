import type {
  Account,
  BudgetType,
  Category,
  ComputedTransaction,
  Settings,
  Transaction,
} from './types'
import { monthKeyOf, resolveRate } from './rate'

// Bu dosya Islemler sayfasindaki gri (formul) kolonlarin birebir
// karsiligidir: Kontrol (I), Tutar EUR (J), Butce (K), Can Payi (L),
// Tugce Payi (M), Ay (N), Kur (Q), Odeyen (R), Oran (S). Degistirilmeden
// once docs/proje-talimatlari.md bolum 5'e ve testlerine bakin.

export { monthKeyOf }

export function findAccount(name: string, settings: Settings): Account | undefined {
  return settings.accounts.find((a) => a.name === name)
}

export function findCategory(name: string, settings: Settings): Category | undefined {
  return settings.categories.find((c) => c.name === name)
}

function resolveRatio(
  tx: Transaction,
  category: Category | undefined,
  payer: string,
): number | undefined {
  if (tx.canPct != null) return tx.canPct
  if (tx.tugcePct != null) return 1 - tx.tugcePct
  if (!category) return undefined
  if (category.budgetType === 'Kişisel' || category.budgetType === 'Taşınma') {
    if (payer === 'Can') return 1
    if (payer === 'Tuğçe') return 0
    return 0.5
  }
  return 0.5
}

function resolveBudgetType(
  category: Category | undefined,
  ratio: number | undefined,
): BudgetType | 'Paylaşım eksik' | '' {
  if (!category) return ''
  if (category.budgetType !== 'Kişisel') return category.budgetType
  if (ratio === 1) return 'Kişisel-Can'
  if (ratio === 0) return 'Kişisel-Tuğçe'
  return 'Paylaşım eksik'
}

function validate(
  tx: Transaction,
  account: Account | undefined,
  category: Category | undefined,
  budgetType: BudgetType | 'Paylaşım eksik' | '',
): string {
  if (!tx.date) return ''
  if (!tx.category || tx.amount == null || !tx.account) {
    return 'Eksik alan: kategori, tutar veya hesap'
  }
  if (!category) return 'Kategori listede yok'
  if (!account) return 'Hesap listede yok'
  if (tx.canPct != null && tx.tugcePct != null) {
    const sum = Math.round((tx.canPct + tx.tugcePct) * 10000) / 10000
    if (sum !== 1) {
      return 'Can % ve Tuğçe % toplamı 100 olmalı, birini boş bırakın'
    }
  }
  if (budgetType === 'Paylaşım eksik') {
    return 'Kişisel harcamada Can % veya Tuğçe % 100 yazın'
  }
  return 'OK'
}

export function computeTransaction(tx: Transaction, settings: Settings): ComputedTransaction {
  const monthKey = tx.date ? monthKeyOf(tx.date) : ''
  const { rate, rateSource } = resolveRate(tx.currency, monthKey, settings)
  const amountEUR = tx.amount != null ? tx.amount / rate : undefined

  const account = findAccount(tx.account, settings)
  const payer = account ? account.owner : ''

  const category = findCategory(tx.category, settings)
  const ratio = resolveRatio(tx, category, payer)
  const budgetType = resolveBudgetType(category, ratio)

  const canShare = amountEUR != null && ratio != null ? amountEUR * ratio : undefined
  const tugceShare = amountEUR != null && canShare != null ? amountEUR - canShare : undefined

  const validation = validate(tx, account, category, budgetType)

  return {
    ...tx,
    monthKey,
    rate,
    rateSource,
    amountEUR,
    payer,
    ratio,
    budgetType,
    canShare,
    tugceShare,
    validation,
  }
}
