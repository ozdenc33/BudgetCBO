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
): { rate: number; rateSource: RateSource; rateWarning: string | undefined } {
  if (!currency || currency === 'EUR') {
    return { rate: 1, rateSource: 'eur', rateWarning: undefined }
  }
  const monthly = settings.rates[monthKey]
  if (monthly && monthly > 0) {
    return { rate: monthly, rateSource: 'monthly', rateWarning: undefined }
  }
  if (settings.defaultRate && settings.defaultRate > 0) {
    return { rate: settings.defaultRate, rateSource: 'default', rateWarning: undefined }
  }
  // Kur hic yok. Eskiden sessizce 1 kullaniliyordu, yani 1 TRY = 1 EUR:
  // TRY tutarlar ~35 kat sisiyor ve hicbir yerde belirtilmiyordu.
  return {
    rate: 1,
    rateSource: 'missing',
    rateWarning: `${monthKey || 'Bu ay'} için ${currency} kuru girilmemiş; tutar 1:1 sayıldı. Ayarlar'dan kuru girin.`,
  }
}
