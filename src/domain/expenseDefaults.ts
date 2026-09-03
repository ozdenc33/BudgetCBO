import { findCategory } from './transactions'
import type { Person, Settings } from './types'

// Yeni harcama formunda kategori secilince "en olasi" hesap/bolusum
// onerisi. Kullanici her zaman elle degistirebilir — bu yalnizca
// baslangic degeri, tipik kullanimda tekrar tekrar ayni seyi secmeyi
// (Kişisel -> kendi hesabın, Mike/Ortak-Dışarı -> yarı yarıya kendi
// hesaplarından, Ortak-Ev -> Ortak Kasa) onlemek icin.

export type CategoryAccountDefaults = {
  account: string
  splitAccounts: boolean
  secondAccount: string
}

function ownAccountOf(settings: Settings, person: Person | undefined): string | undefined {
  if (!person) return undefined
  return settings.accounts.find((a) => a.owner === person)?.name
}

export function defaultAccountsForCategory(
  categoryName: string,
  settings: Settings,
  currentPerson: Person | undefined,
): CategoryAccountDefaults | undefined {
  const category = findCategory(categoryName, settings)
  if (!category) return undefined

  if (category.budgetType === 'Kişisel' || category.budgetType === 'Taşınma') {
    const own = ownAccountOf(settings, currentPerson)
    if (!own) return undefined
    return { account: own, splitAccounts: false, secondAccount: '' }
  }

  if (category.budgetType === 'Ortak-Ev') {
    const hasOrtakKasa = settings.accounts.some((a) => a.name === 'Ortak Kasa')
    if (!hasOrtakKasa) return undefined
    return { account: 'Ortak Kasa', splitAccounts: false, secondAccount: '' }
  }

  // Mike, Ortak-Dışarı: genelde biri anlik oder ama yari yariya
  // paylasilir — varsayilan olarak ikisinin de kendi hesabindan yari
  // yariya cekilmesi onerilir (kullanici Ortak Kasa'ya da cevirebilir).
  const canAccount = ownAccountOf(settings, 'Can')
  const tugceAccount = ownAccountOf(settings, 'Tuğçe')
  if (!canAccount || !tugceAccount) return undefined
  return { account: canAccount, splitAccounts: true, secondAccount: tugceAccount }
}
