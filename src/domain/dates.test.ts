import { describe, expect, it } from 'vitest'
import { addDaysISO, localISO, localMonthKey, parseISO } from './dates'

describe('localISO / localMonthKey', () => {
  it('yerel tarihi dondurur, UTC kaymasi yasanmaz', () => {
    // 1 Agustos 01:00 yerel saat. toISOString() bunu 31 Temmuz olarak
    // gorurdu (UTC+2 varsayimiyla); localISO gormemeli.
    const d = new Date(2026, 7, 1, 1, 0, 0)
    expect(localISO(d)).toBe('2026-08-01')
    expect(localMonthKey(d)).toBe('2026-08')
  })

  it('gec saatte de ayni gunu verir', () => {
    const d = new Date(2026, 6, 15, 23, 59, 0)
    expect(localISO(d)).toBe('2026-07-15')
  })

  it('tek haneli ay ve gunu sifirla doldurur', () => {
    expect(localISO(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(localMonthKey(new Date(2026, 0, 5))).toBe('2026-01')
  })
})

describe('parseISO', () => {
  it('yerel gece yarisini verir, UTC gece yarisini degil', () => {
    const d = parseISO('2026-08-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(1)
    expect(d.getHours()).toBe(0)
  })
})

describe('addDaysISO', () => {
  it('gun ekler', () => {
    expect(addDaysISO('2026-07-15', 7)).toBe('2026-07-22')
  })

  it('ay sinirini asar', () => {
    expect(addDaysISO('2026-07-30', 3)).toBe('2026-08-02')
  })

  it('geriye gider', () => {
    expect(addDaysISO('2026-08-02', -3)).toBe('2026-07-30')
  })

  it('yaz saati gecisinde gun kaybetmez (Avrupa/Berlin, 29 Mart 2026)', () => {
    expect(addDaysISO('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDaysISO('2026-03-29', 1)).toBe('2026-03-30')
  })
})
