import type { Transaction, TransactionDraft } from './types'

// Proje talimatlari bolum 6.6: "Aynı gün, aynı tutar, aynı kategori
// girilirse uyarı verilir, engellenmez." Excel'de karsiligi yok; bu
// uygulamanin ekledigi bir otomasyondur.

export function findDuplicateTransaction(
  draft: TransactionDraft,
  existing: Transaction[],
): Transaction | undefined {
  if (!draft.date || !draft.category || draft.amount == null) return undefined
  return existing.find(
    (t) => t.date === draft.date && t.category === draft.category && t.amount === draft.amount,
  )
}
