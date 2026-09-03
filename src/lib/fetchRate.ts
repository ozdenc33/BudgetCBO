/**
 * Guncel EUR/TRY kurunu getirir.
 *
 * NEDEN: Kur elle giriliyordu ve girilmedigi zaman tutarlar 1:1
 * hesaplaniyordu (bkz. src/domain/rate.ts). Bu, kuru DOGRUDAN
 * kaydetmez — yalnizca bir oneri getirir, kullanici gormeden hicbir
 * ayar degismez.
 *
 * Kaynak: Frankfurter (frankfurter.dev), Avrupa Merkez Bankasi'nin
 * gunluk referans kurlarini CORS destegiyle sunar. ECB'nin kendi XML
 * ucu tarayicidan cagrilamaz (CORS baslik gondermiyor).
 *
 * Ag hatasi normaldir (cevrimdisi, servis kapali): cagiran taraf
 * hatayi gosterip elle girise devam etmeli, uygulama bu servise
 * BAGIMLI DEGILDIR.
 */

const ENDPOINT = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=TRY'

export type FetchedRate = {
  /** 1 EUR = ? TRY */
  rate: number
  /** Kurun ait oldugu tarih (YYYY-MM-DD). ECB hafta sonu yayin yapmaz. */
  date: string
}

export async function fetchEurTryRate(signal?: AbortSignal): Promise<FetchedRate> {
  const response = await fetch(ENDPOINT, { signal })
  if (!response.ok) {
    throw new Error(`Kur servisi ${response.status} döndürdü`)
  }
  const body: unknown = await response.json()
  return parseRateResponse(body)
}

/**
 * Belirli bir GECMIS tarihin kurunu getirir (orn. bir TL harcamayi o
 * gunun kuruyla EUR'a cevirmek icin — "kur elle girilmemis" durumunda
 * kullanicinin en cok ihtiyaci olan budur, gunumuzun kuru degil).
 *
 * ECB hafta sonu/tatil gunu yayin yapmaz; Frankfurter boyle bir tarih
 * icin bir ONCEKI is gununun kurunu doner (kendi davranisi), ayrica
 * islem gerekmez.
 */
export async function fetchEurTryRateForDate(
  dateISO: string,
  signal?: AbortSignal,
): Promise<FetchedRate> {
  const response = await fetch(`https://api.frankfurter.dev/v1/${dateISO}?base=EUR&symbols=TRY`, {
    signal,
  })
  if (!response.ok) {
    throw new Error(`Kur servisi ${response.status} döndürdü`)
  }
  const body: unknown = await response.json()
  return parseRateResponse(body)
}

/** Yanit govdesini dogrular. Ayri fonksiyon: aga cikmadan test edilebilir. */
export function parseRateResponse(body: unknown): FetchedRate {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Kur servisi beklenmeyen bir yanıt döndürdü')
  }
  const record = body as Record<string, unknown>
  const rates = record.rates
  const value =
    typeof rates === 'object' && rates !== null ? (rates as Record<string, unknown>).TRY : undefined

  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('Kur servisi geçerli bir TRY kuru döndürmedi')
  }
  const date = typeof record.date === 'string' ? record.date : ''
  return { rate: value, date }
}
