import { localISO } from './dates'
import type { ComputedTransaction } from './types'

// Ileri tarihli kayitlar: tarihi bugunden sonra olanlar. Ornegin ayin
// 15'indeki Rundfunkbeitrag ayin 3'unde girilmisse, o para henuz cikmadi.
//
// ONEMLI: toplamlarin anlamini sessizce degistirmiyoruz. Excel'de SUMIFS
// tarihe bakmadan her kaydi toplar; burada da toplamlar ayni kaliyor.
// Yapilan tek sey bu kayitlari gorunur kilmak: listede rozet, Ay
// Panosu'nda bilgi notu. Boylece "bu ay 1.479 € harcamisiz" derken
// icinde henuz cikmamis 18,36 € oldugunu kullanici bilir.

// Yerel tarih kullanilir: `toISOString()` UTC dondururdu ve Almanya
// saatiyle gece 00:00-02:00 arasi her kayit "ileri tarihli" gorunurdu.
export function todayISO(today: Date): string {
  return localISO(today)
}

export function isFutureDated(dateISO: string, today: Date): boolean {
  return Boolean(dateISO) && dateISO > todayISO(today)
}

export type FutureDatedSummary = {
  count: number
  totalEUR: number
}

/** Verilen (zaten filtrelenmis) kayitlar icinde ileri tarihli olanlarin ozeti. */
export function summarizeFutureDated(
  transactions: ComputedTransaction[],
  today: Date,
): FutureDatedSummary {
  const future = transactions.filter((t) => isFutureDated(t.date, today))
  return {
    count: future.length,
    totalEUR: future.reduce((sum, t) => sum + (t.amountEUR ?? 0), 0),
  }
}
