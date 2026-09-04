import { describe, expect, it } from 'vitest'
import { parseRateResponse } from './fetchRate'

describe('parseRateResponse', () => {
  it('gecerli yaniti okur', () => {
    expect(parseRateResponse({ date: '2026-09-02', rates: { TRY: 47.31 } })).toEqual({
      rate: 47.31,
      date: '2026-09-02',
    })
  })

  it('tarih yoksa bos birakir', () => {
    expect(parseRateResponse({ rates: { TRY: 47.31 } }).date).toBe('')
  })

  it('TRY kuru yoksa hata verir', () => {
    expect(() => parseRateResponse({ date: '2026-09-02', rates: { USD: 1.1 } })).toThrow()
  })

  it('kur sayi degilse hata verir', () => {
    expect(() => parseRateResponse({ rates: { TRY: '47.31' } })).toThrow()
  })

  it('sifir veya negatif kuru reddeder', () => {
    expect(() => parseRateResponse({ rates: { TRY: 0 } })).toThrow()
    expect(() => parseRateResponse({ rates: { TRY: -5 } })).toThrow()
  })

  it('bicimsiz yaniti reddeder', () => {
    expect(() => parseRateResponse(null)).toThrow()
    expect(() => parseRateResponse('bum')).toThrow()
    expect(() => parseRateResponse({})).toThrow()
  })
})
