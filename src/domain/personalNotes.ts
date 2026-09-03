import { findCategory } from './transactions'
import type { Person, Settings, TransactionDraft } from './types'

// Uygulamanin kucuk kisisel notlari. Excel'de karsiliklari yoktur;
// hesaplamalarin hicbirine karismazlar, yalnizca ekranda kisa bir
// bildirim olarak gorunurler. Metinler tek yerde dursun diye burada.

export const TUGCE_WELCOME_NOTE = 'Hoş geldin ballı kurabiyem'

export const MIKE_THANKS_NOTE = 'Teşekkürler 🐾 -Mike'

/** Giris yapan kisi icin gosterilecek karsilama notu (yoksa undefined). */
export function welcomeNoteFor(person: Person | undefined): string | undefined {
  return person === 'Tuğçe' ? TUGCE_WELCOME_NOTE : undefined
}

/**
 * Kayit Mike'in butcesine mi giriyor? Kategori adina degil, kategorinin
 * Ayarlar'daki butce tipine bakar; boylece yeni bir kedi kategorisi
 * eklendiginde burayi guncellemek gerekmez.
 */
export function isMikeExpense(
  draft: Pick<TransactionDraft, 'category'>,
  settings: Settings,
): boolean {
  if (!draft.category) return false
  return findCategory(draft.category, settings)?.budgetType === 'Mike'
}
