import { describe, expect, it } from 'vitest'
import { resolveRate } from './rate'
import { DEFAULT_SETTINGS } from './constants'
import type { Settings } from './types'

const withRates = (rates: Record<string, number>, defaultRate: number): Settings => ({
  ...DEFAULT_SETTINGS,
  rates,
  defaultRate,
})

describe('resolveRate', () => {
  it('EUR icin kur 1, uyari yok', () => {
    const r = resolveRate('EUR', '2026-07', withRates({}, 35))
    expect(r).toEqual({ rate: 1, rateSource: 'eur', rateWarning: undefined })
  })

  it('para birimi bossa EUR gibi davranir', () => {
    expect(resolveRate('', '2026-07', withRates({}, 35)).rateSource).toBe('eur')
  })

  it('o ayin kuru varsa onu kullanir', () => {
    const r = resolveRate('TRY', '2026-07', withRates({ '2026-07': 38.5 }, 35))
    expect(r.rate).toBe(38.5)
    expect(r.rateSource).toBe('monthly')
    expect(r.rateWarning).toBeUndefined()
  })

  it('ay kuru yoksa varsayilan kura duser', () => {
    const r = resolveRate('TRY', '2026-07', withRates({}, 35))
    expect(r.rate).toBe(35)
    expect(r.rateSource).toBe('default')
    expect(r.rateWarning).toBeUndefined()
  })

  // Onceki davranis: varsayilan kur 0/eksik oldugunda sessizce 1
  // kullaniliyordu, yani 1 TRY = 1 EUR ve TRY tutarlar ~35 kat sisiyordu.
  it('hic kur yoksa 1 kullanir AMA uyarir', () => {
    const r = resolveRate('TRY', '2026-07', withRates({}, 0))
    expect(r.rate).toBe(1)
    expect(r.rateSource).toBe('missing')
    expect(r.rateWarning).toContain('kuru girilmemiş')
    expect(r.rateWarning).toContain('2026-07')
  })

  it('ay kuru 0 ise gecerli sayilmaz', () => {
    const r = resolveRate('TRY', '2026-07', withRates({ '2026-07': 0 }, 0))
    expect(r.rateSource).toBe('missing')
  })

  it('negatif varsayilan kur gecerli sayilmaz', () => {
    expect(resolveRate('TRY', '2026-07', withRates({}, -5)).rateSource).toBe('missing')
  })

  it('yon belirtilmezse varsayilan "neutral" olur, kur degismez', () => {
    const r = resolveRate('TRY', '2026-07', withRates({ '2026-07': 40 }, 35))
    expect(r.rate).toBe(40)
  })
})

// Makas farki (bkz. src/domain/types.ts Settings.fxSpreadPct): gercek
// banka/exchange islemlerinde alis-satis kuru arasindaki farki
// muhafazakar yonde hesaba katar.
describe('resolveRate — makas farki (fxSpreadPct)', () => {
  const withSpread = (spreadPct: number, monthly = 40): Settings => ({
    ...DEFAULT_SETTINGS,
    rates: { '2026-07': monthly },
    defaultRate: 35,
    fxSpreadPct: spreadPct,
  })

  it('spread 0 ise (varsayilan) kur degismez, tum yonlerde ayni', () => {
    const settings = withSpread(0)
    expect(resolveRate('TRY', '2026-07', settings, 'income').rate).toBe(40)
    expect(resolveRate('TRY', '2026-07', settings, 'expense').rate).toBe(40)
    expect(resolveRate('TRY', '2026-07', settings, 'neutral').rate).toBe(40)
  })

  it('gelirde (income) kur YUKSEKTEN alinir -> daha az EUR', () => {
    const r = resolveRate('TRY', '2026-07', withSpread(2), 'income')
    // 40 * 1.02 = 40.8. Daha yuksek kur = ayni TRY icin daha az EUR.
    expect(r.rate).toBeCloseTo(40.8)
  })

  it('giderde (expense) kur DUSUKTEN hesaplanir -> daha cok EUR (daha buyuk maliyet)', () => {
    const r = resolveRate('TRY', '2026-07', withSpread(2), 'expense')
    // 40 * 0.98 = 39.2. Daha dusuk kur = ayni TRY icin daha cok EUR.
    expect(r.rate).toBeCloseTo(39.2)
  })

  it('neutral (transferler) yonde makas uygulanmaz', () => {
    const r = resolveRate('TRY', '2026-07', withSpread(2), 'neutral')
    expect(r.rate).toBe(40)
  })

  it('gelir icin daha yuksek kur, gerceklesen EUR tutarini KUCULTUR', () => {
    const settings = withSpread(2)
    const noSpreadEUR = 1000 / resolveRate('TRY', '2026-07', withSpread(0), 'income').rate
    const withSpreadEUR = 1000 / resolveRate('TRY', '2026-07', settings, 'income').rate
    expect(withSpreadEUR).toBeLessThan(noSpreadEUR)
  })

  it('gider icin daha dusuk kur, gerceklesen EUR maliyetini BUYUTUR', () => {
    const settings = withSpread(2)
    const noSpreadEUR = 1000 / resolveRate('TRY', '2026-07', withSpread(0), 'expense').rate
    const withSpreadEUR = 1000 / resolveRate('TRY', '2026-07', settings, 'expense').rate
    expect(withSpreadEUR).toBeGreaterThan(noSpreadEUR)
  })

  it('kur hic yoksa (missing) makas uygulanmaz, hala 1:1 uyarisi doner', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, rates: {}, defaultRate: 0, fxSpreadPct: 5 }
    const r = resolveRate('TRY', '2026-07', settings, 'income')
    expect(r.rate).toBe(1)
    expect(r.rateSource).toBe('missing')
  })

  it('EUR icin makas hic devreye girmez', () => {
    const r = resolveRate('EUR', '2026-07', withSpread(10), 'expense')
    expect(r.rate).toBe(1)
  })

  it('fxSpreadPct tanimsizsa (eski Firestore dokumani) 0 kabul edilir', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, rates: { '2026-07': 40 }, defaultRate: 35 }
    delete (settings as { fxSpreadPct?: number }).fxSpreadPct
    expect(resolveRate('TRY', '2026-07', settings, 'income').rate).toBe(40)
  })
})
