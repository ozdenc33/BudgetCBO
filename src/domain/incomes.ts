import type { ComputedIncome, Income, Settings } from './types'
import { monthKeyOf, resolveRate } from './rate'

// Gelirler sayfasindaki gri kolonlarin birebir karsiligidir: Ay (B),
// Kur (G), Tutar EUR (H), Kontrol (K). Islemler'in aksine kaynak ve
// hesap, Ayarlar listelerine karsi dogrulanmaz (Excel'de de yok);
// sadece zorunlu alanlar kontrol edilir.

function validate(income: Income): string {
  if (!income.date) return ''
  if (!income.source || !income.person || income.amount == null || !income.account) {
    return 'Eksik alan: kaynak, kişi, tutar veya hesap'
  }
  return 'OK'
}

export function computeIncome(income: Income, settings: Settings): ComputedIncome {
  const monthKey = income.date ? monthKeyOf(income.date) : ''
  const { rate, rateSource, rateWarning } = resolveRate(income.currency, monthKey, settings)
  const amountEUR = income.amount != null ? income.amount / rate : undefined
  const validation = validate(income)

  return {
    ...income,
    monthKey,
    rate,
    rateSource,
    rateWarning,
    amountEUR,
    validation,
  }
}
