import type { Currency, RateSource, Settings } from './types'

// Islemler, Gelirler ve Transferler sayfalarindaki Kur kolonunun ortak
// mantigi: para birimi EUR ise kur 1; degilse o ayin kuru, o da yoksa
// varsayilan kur kullanilir.

export function monthKeyOf(date: string): string {
  // date: YYYY-MM-DD -> YYYY-MM (Excel'deki YYYY-AA ile ayni bicim)
  return date.slice(0, 7)
}

/**
 * Kur cevirisinin hangi yonde oldugu — makas farkinin (bkz.
 * Settings.fxSpreadPct) hangi tarafa uygulanacagini belirler.
 *   'income'  : TRY -> EUR, PARA GIRISI (Gelirler). Kur biraz
 *               YUKSEKTEN alinir -> daha AZ EUR (muhafazakar).
 *   'expense' : TRY -> EUR, PARA CIKISI (Islemler). Kur biraz
 *               DUSUKTEN hesaplanir -> daha COK EUR, yani gercek
 *               maliyet alttan tahmin edilmez (muhafazakar).
 *   'neutral' : gercek bir banka/exchange islemi varsayilmaz (orn.
 *               Transferler — kendi hesaplar arasi ic kayit); orta
 *               piyasa kuru aynen kullanilir, makas uygulanmaz.
 */
export type RateDirection = 'income' | 'expense' | 'neutral'

function applySpread(rate: number, direction: RateDirection, spreadPct: number): number {
  if (spreadPct <= 0 || direction === 'neutral') return rate
  const spread = spreadPct / 100
  return direction === 'income' ? rate * (1 + spread) : rate * (1 - spread)
}

export function resolveRate(
  currency: Currency | '',
  monthKey: string,
  settings: Settings,
  direction: RateDirection = 'neutral',
): { rate: number; rateSource: RateSource; rateWarning: string | undefined } {
  if (!currency || currency === 'EUR') {
    return { rate: 1, rateSource: 'eur', rateWarning: undefined }
  }

  // Makas farki SADECE gercek bir kur varken (aylik ya da varsayilan)
  // uygulanir; kur hic yoksa (asagida) zaten 1:1 uyarisiyla
  // isaretleniyor, ustune bir de makas eklemek yaniltici olur.
  const spreadPct = settings.fxSpreadPct ?? 0

  const monthly = settings.rates[monthKey]
  if (monthly && monthly > 0) {
    return {
      rate: applySpread(monthly, direction, spreadPct),
      rateSource: 'monthly',
      rateWarning: undefined,
    }
  }
  if (settings.defaultRate && settings.defaultRate > 0) {
    return {
      rate: applySpread(settings.defaultRate, direction, spreadPct),
      rateSource: 'default',
      rateWarning: undefined,
    }
  }
  // Kur hic yok. Eskiden sessizce 1 kullaniliyordu, yani 1 TRY = 1 EUR:
  // TRY tutarlar ~35 kat sisiyor ve hicbir yerde belirtilmiyordu.
  return {
    rate: 1,
    rateSource: 'missing',
    rateWarning: `${monthKey || 'Bu ay'} için ${currency} kuru girilmemiş; tutar 1:1 sayıldı. Ayarlar'dan kuru girin.`,
  }
}
