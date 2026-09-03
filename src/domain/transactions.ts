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

/**
 * Hesap ve kategori aramalari icin ad->kayit indeksi.
 *
 * NEDEN: Bu iki arama her islem icin bir kez calisir ve `Array.find`
 * ile ~45 kategori + 8 hesap uzerinde geziyordu. Ay panosu, bakiyeler,
 * limit uyarilari gibi hesaplar ayni listeyi bastan sona birkac kez
 * dolastigi icin maliyet kayit sayisiyla carpiliyordu.
 *
 * Indeks WeakMap'te settings nesnesine bagli tutulur: Firestore her
 * anlik goruntude yeni bir settings nesnesi verdigi icin indeks
 * kendiliginden tazelenir, eskisi cop toplayiciya birakilir.
 */
type SettingsIndex = {
  accounts: Map<string, Account>
  categories: Map<string, Category>
}

const settingsIndexCache = new WeakMap<Settings, SettingsIndex>()

function indexOf(settings: Settings): SettingsIndex {
  const cached = settingsIndexCache.get(settings)
  if (cached) return cached
  const index: SettingsIndex = {
    accounts: new Map(settings.accounts.map((a) => [a.name, a])),
    categories: new Map(settings.categories.map((c) => [c.name, c])),
  }
  settingsIndexCache.set(settings, index)
  return index
}

export function findAccount(name: string, settings: Settings): Account | undefined {
  return indexOf(settings).accounts.get(name)
}

export function findCategory(name: string, settings: Settings): Category | undefined {
  return indexOf(settings).categories.get(name)
}

/**
 * Gercekten iki farkli hesaptan bolusuk cekilis mi? `secondAccount`
 * girilmis olsa da `account`'la ayniysa (orn. ikisi de "Ortak Kasa"
 * secildiginde) tek hesaptan cekilis demektir — eski/basit davranis.
 */
export function isSplitAccountTransaction(tx: Transaction): boolean {
  return Boolean(tx.secondAccount) && tx.secondAccount !== tx.account
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

export const PAYLAŞIM_EKSIK_MESSAGE = 'Kişisel harcamada Can % veya Tuğçe % 100 yazın'

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
  settings: Settings,
): string {
  if (!tx.date) return ''
  if (!tx.category || tx.amount == null || !tx.account) {
    return 'Eksik alan: kategori, tutar veya hesap'
  }
  if (!category) return 'Kategori listede yok'
  if (!account) return 'Hesap listede yok'
  if (isSplitAccountTransaction(tx) && !findAccount(tx.secondAccount!, settings)) {
    return 'İkinci hesap listede yok'
  }
  if (tx.canPct != null && tx.tugcePct != null) {
    const sum = Math.round((tx.canPct + tx.tugcePct) * 10000) / 10000
    if (sum !== 1) {
      return 'Can % ve Tuğçe % toplamı 100 olmalı, birini boş bırakın'
    }
  }
  if (budgetType === 'Paylaşım eksik') {
    return PAYLAŞIM_EKSIK_MESSAGE
  }
  return 'OK'
}

export function computeTransaction(tx: Transaction, settings: Settings): ComputedTransaction {
  const monthKey = tx.date ? monthKeyOf(tx.date) : ''
  // 'expense': TRY -> EUR harcamalarda makas farki muhafazakar yonde
  // uygulanir (bkz. src/domain/rate.ts).
  const { rate, rateSource, rateWarning } = resolveRate(tx.currency, monthKey, settings, 'expense')
  const amountEUR = tx.amount != null ? tx.amount / rate : undefined

  const account = findAccount(tx.account, settings)
  const payer = account ? account.owner : ''

  const category = findCategory(tx.category, settings)
  const ratio = resolveRatio(tx, category, payer)
  const budgetType = resolveBudgetType(category, ratio)

  const canShare = amountEUR != null && ratio != null ? amountEUR * ratio : undefined
  const tugceShare = amountEUR != null && canShare != null ? amountEUR - canShare : undefined

  const validation = validate(tx, account, category, budgetType, settings)

  return {
    ...tx,
    monthKey,
    rate,
    rateSource,
    rateWarning,
    amountEUR,
    payer,
    ratio,
    budgetType,
    canShare,
    tugceShare,
    validation,
  }
}
