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
})
