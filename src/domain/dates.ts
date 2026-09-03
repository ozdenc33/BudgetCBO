// Tarih yardimcilari — TEK dogru kaynak.
//
// NEDEN: Onceden her sayfa `new Date().toISOString().slice(0, 10)`
// kullaniyordu. `toISOString()` UTC dondurur, biz ise Almanya'dayiz
// (UTC+1/+2). Gece 00:00 ile 02:00 arasi girilen bir harcama bir onceki
// gune yaziliyordu; ayin 1'inde saat 01:00'de Ana Sayfa ve Ay Panosu
// hala onceki ayi gosteriyordu. Bu dosyadaki fonksiyonlar tarihi
// kullanicinin YEREL saatine gore uretir.
//
// Kayitlarda saklanan bicim her yerde YYYY-MM-DD (Excel'deki gibi) ve
// string karsilastirmasiyla siralanabilir olmalidir.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Verilen Date'in YEREL tarihini YYYY-MM-DD olarak dondurur. */
export function localISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Verilen Date'in YEREL ayini YYYY-MM olarak dondurur. */
export function localMonthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

/** Bugunun yerel tarihi (YYYY-MM-DD). */
export function todayISO(): string {
  return localISO(new Date())
}

/** Icinde bulundugumuz yerel ay (YYYY-MM). */
export function todayMonthKey(): string {
  return localMonthKey(new Date())
}

/**
 * YYYY-MM-DD metnini yerel gece yarisinda bir Date'e cevirir.
 * `new Date('2026-08-01')` UTC gece yarisi olarak yorumlanir ve
 * UTC+2'de 1 Agustos 02:00 verir; gun aritmetiginde bu kayma
 * birikerek hataya donusur, o yuzden parcalayarak kuruyoruz.
 */
export function parseISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

/** Bir ISO tarihe gun ekler/cikarir, sonucu yine ISO dondurur. */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return localISO(d)
}
