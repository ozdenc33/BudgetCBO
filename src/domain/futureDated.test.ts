import { describe, expect, it } from 'vitest'
import { isFutureDated, summarizeFutureDated, todayISO } from './futureDated'
import { computeTransaction } from './transactions'
import { DEFAULT_SETTINGS } from './constants'
import type { Transaction } from './types'

const TODAY = new Date('2026-09-03T12:00:00')

const RAW: Transaction[] = [
  { id: '1', date: '2026-09-01', description: 'Kira', category: 'Kira (Kaltmiete)', amount: 720, currency: 'EUR', account: 'Ortak Kasa' },
  { id: '2', date: '2026-09-03', description: 'Market', category: 'Market (Ev)', amount: 40, currency: 'EUR', account: 'Ortak Kasa' },
  { id: '3', date: '2026-09-15', description: 'Rundfunkbeitrag', category: 'Rundfunkbeitrag', amount: 18.36, currency: 'EUR', account: 'Ortak Kasa' },
  { id: '4', date: '2026-09-20', description: 'Internet', category: 'Internet', amount: 39.9, currency: 'EUR', account: 'Ortak Kasa' },
]
const TX = RAW.map((t) => computeTransaction(t, DEFAULT_SETTINGS))

describe('isFutureDated', () => {
  it('bugunden sonraki tarih ileri tarihlidir', () => {
    expect(isFutureDated('2026-09-15', TODAY)).toBe(true)
  })

  it('bugun ileri tarihli sayilmaz', () => {
    expect(isFutureDated('2026-09-03', TODAY)).toBe(false)
  })

  it('gecmis tarih ileri tarihli sayilmaz', () => {
    expect(isFutureDated('2026-09-01', TODAY)).toBe(false)
  })

  it('bos tarih ileri tarihli sayilmaz', () => {
    expect(isFutureDated('', TODAY)).toBe(false)
  })
})

describe('todayISO', () => {
  it('tarihi YYYY-AA-GG olarak verir', () => {
    expect(todayISO(TODAY)).toBe('2026-09-03')
  })
})

describe('summarizeFutureDated', () => {
  it('ileri tarihli kayitlarin sayisini ve toplamini verir', () => {
    const s = summarizeFutureDated(TX, TODAY)
    expect(s.count).toBe(2)
    expect(s.totalEUR).toBeCloseTo(18.36 + 39.9)
  })

  it('ileri tarihli kayit yoksa sifir doner', () => {
    const s = summarizeFutureDated(TX.slice(0, 2), TODAY)
    expect(s.count).toBe(0)
    expect(s.totalEUR).toBe(0)
  })
})
