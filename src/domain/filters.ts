import type { BudgetType, ComputedTransaction } from './types'
import { monthKeyOf } from './transactions'

// Liste filtreleme. Excel'de karsiligi yok (orada AutoFilter kullanilir);
// kayit sayisi buyudukce listeyi kullanilabilir tutmak icin eklendi.
// Saf fonksiyon: yalnizca hesaplanmis kayitlari suzer, hicbir tutar veya
// oran yeniden hesaplamaz.

export type TransactionFilter = {
  /** Aciklama, kategori, hesap, etiket ve notta gecen serbest metin. */
  text?: string
  /** 'YYYY-MM' veya tum aylar icin bos. */
  monthKey?: string
  category?: string
  account?: string
  budgetType?: BudgetType | ''
  minAmountEUR?: number
  maxAmountEUR?: number
}

function normalize(value: string): string {
  // Turkce'ye uygun kucultme: I/İ ayrimi locale ile dogru calisir.
  return value.toLocaleLowerCase('tr')
}

function matchesText(tx: ComputedTransaction, needle: string): boolean {
  const haystack = [tx.description, tx.category, tx.account, tx.tag ?? '', tx.note ?? '']
    .join(' ')
  return normalize(haystack).includes(normalize(needle))
}

export function filterTransactions(
  transactions: ComputedTransaction[],
  filter: TransactionFilter,
): ComputedTransaction[] {
  const text = filter.text?.trim()
  return transactions.filter((tx) => {
    if (filter.monthKey && monthKeyOf(tx.date) !== filter.monthKey) return false
    if (filter.category && tx.category !== filter.category) return false
    if (filter.account && tx.account !== filter.account) return false
    if (filter.budgetType && tx.budgetType !== filter.budgetType) return false
    if (filter.minAmountEUR != null && (tx.amountEUR ?? 0) < filter.minAmountEUR) return false
    if (filter.maxAmountEUR != null && (tx.amountEUR ?? 0) > filter.maxAmountEUR) return false
    if (text && !matchesText(tx, text)) return false
    return true
  })
}

/** Filtrelenmis listenin EUR toplami (basliktaki "N kayit · X €" icin). */
export function sumFilteredEUR(transactions: ComputedTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + (tx.amountEUR ?? 0), 0)
}

export function isEmptyFilter(filter: TransactionFilter): boolean {
  return (
    !filter.text?.trim() &&
    !filter.category &&
    !filter.account &&
    !filter.budgetType &&
    filter.minAmountEUR == null &&
    filter.maxAmountEUR == null
  )
}
