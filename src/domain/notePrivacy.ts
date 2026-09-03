import type { AccountOwner, Person } from './types'

// Kişisel kategorideki "Not" alanı, surpriz hediye gibi durumlar icin
// yalnizca harcamayi yapan kisiye gorunur (orn. Can, Tuğçe'ye hediye
// alip "hediye" notu yazarsa Tuğçe bu notu gormemeli). Bu bir arayuz
// seviyesi gizleme — Firestore verisi iki kullanici arasinda paylasimli
// oldugu icin sifreleme degildir, yalnizca normal kullanimda notun
// listede/duzenleme formunda gorunmemesini saglar.

export function isPersonalBudgetType(
  budgetType: string | undefined,
): budgetType is 'Kişisel-Can' | 'Kişisel-Tuğçe' {
  return budgetType === 'Kişisel-Can' || budgetType === 'Kişisel-Tuğçe'
}

/** Notu gorebilecek/duzenleyebilecek kisi: kisisel-disi kayitlarda herkes, kisiselde sadece odeyen. */
export function isNoteVisibleTo(
  tx: { budgetType?: string; payer?: AccountOwner | '' },
  viewer: Person | undefined,
): boolean {
  if (!isPersonalBudgetType(tx.budgetType)) return true
  return tx.payer === viewer
}
