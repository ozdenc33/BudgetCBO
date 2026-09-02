import type { Currency, RateSource, Settings } from './types'

// Islemler, Gelirler ve Transferler sayfalarindaki Kur kolonunun ortak
// mantigi: para birimi EUR ise kur 1; degilse o ayin kuru, o da yoksa
// varsayilan kur kullanilir.

export function monthKeyOf(date: string): string {
  // date: YYYY-MM-DD -> YYYY-MM (Excel'deki YYYY-AA ile ayni bicim)
  return date.slice(0, 7)
}

export function resolveRate(
  currency: Currency | '',
  monthKey: string,
  settings: Settings,
): { rate: number; rateSource: RateSource } {
  if (!currency || currency === 'EUR') return { rate: 1, rateSource: 'eur' }
  const monthly = settings.rates[monthKey]
  if (monthly && monthly > 0) return { rate: monthly, rateSource: 'monthly' }
  return { rate: settings.defaultRate || 1, rateSource: 'default' }
}
