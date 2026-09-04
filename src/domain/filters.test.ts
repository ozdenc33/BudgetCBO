import { describe, expect, it } from 'vitest'
import { filterTransactions, isEmptyFilter, sumFilteredEUR } from './filters'
import { computeTransaction } from './transactions'
import { DEFAULT_SETTINGS } from './constants'
import type { Transaction } from './types'

const RAW: Transaction[] = [
  {
    id: '1',
    date: '2026-09-01',
    description: 'Kira',
    category: 'Kira (Kaltmiete)',
    amount: 720,
    currency: 'EUR',
    account: 'Ortak Kasa',
  },
  {
    id: '2',
    date: '2026-09-02',
    description: 'Market alışverişi',
    category: 'Market (Ev)',
    amount: 48.9,
    currency: 'EUR',
    account: 'Ortak Kasa',
  },
  {
    id: '3',
    date: '2026-09-03',
    description: 'Akşam yemeği',
    category: 'Restoran/Kafe',
    amount: 34.5,
    currency: 'EUR',
    account: 'Can-DE Girokonto',
  },
  {
    id: '4',
    date: '2026-08-15',
    description: 'Kuaför',
    category: 'Kuaför/Bakım',
    amount: 40,
    currency: 'EUR',
    account: 'Tuğçe-DE Girokonto',
  },
  {
    id: '5',
    date: '2026-09-04',
    description: 'İnternet faturası',
    category: 'Internet',
    amount: 39.9,
    currency: 'EUR',
    account: 'Ortak Kasa',
    tag: 'fatura',
  },
]

const TX = RAW.map((t) => computeTransaction(t, DEFAULT_SETTINGS))

describe('filterTransactions', () => {
  it('bos filtre hepsini dondurur', () => {
    expect(filterTransactions(TX, {})).toHaveLength(5)
  })

  it('ay filtresi yalnizca o ayin kayitlarini birakir', () => {
    const rows = filterTransactions(TX, { monthKey: '2026-09' })
    expect(rows.map((r) => r.id)).toEqual(['1', '2', '3', '5'])
  })

  it('metin aramasi aciklamada gecer', () => {
    expect(filterTransactions(TX, { text: 'market' }).map((r) => r.id)).toEqual(['2'])
  })

  it('metin aramasi kategoride de gecer', () => {
    expect(filterTransactions(TX, { text: 'kaltmiete' }).map((r) => r.id)).toEqual(['1'])
  })

  it('metin aramasi etikette de gecer', () => {
    expect(filterTransactions(TX, { text: 'fatura' }).map((r) => r.id)).toEqual(['5'])
  })

  it('Turkce buyuk/kucuk harf farkini yok sayar (İ/ı)', () => {
    expect(filterTransactions(TX, { text: 'İNTERNET' }).map((r) => r.id)).toEqual(['5'])
    expect(filterTransactions(TX, { text: 'akşam' }).map((r) => r.id)).toEqual(['3'])
  })

  it('hesap filtresi calisir', () => {
    expect(filterTransactions(TX, { account: 'Can-DE Girokonto' }).map((r) => r.id)).toEqual(['3'])
  })

  it('kategori filtresi calisir', () => {
    expect(filterTransactions(TX, { category: 'Market (Ev)' }).map((r) => r.id)).toEqual(['2'])
  })

  it('butce tipi filtresi calisir', () => {
    expect(filterTransactions(TX, { budgetType: 'Ortak-Dışarı' }).map((r) => r.id)).toEqual(['3'])
  })

  it('tutar araligi filtresi calisir', () => {
    expect(filterTransactions(TX, { minAmountEUR: 100 }).map((r) => r.id)).toEqual(['1'])
    // 34.5, 40 ve 39.9 -> ucu de sinira esit veya altinda
    expect(filterTransactions(TX, { maxAmountEUR: 40 }).map((r) => r.id)).toEqual(['3', '4', '5'])
  })

  it('filtreler birlikte uygulanir (ve baglaci)', () => {
    const rows = filterTransactions(TX, {
      monthKey: '2026-09',
      account: 'Ortak Kasa',
      maxAmountEUR: 100,
    })
    expect(rows.map((r) => r.id)).toEqual(['2', '5'])
  })

  it('kisisel harcamanin notu sadece odeyen kisiye arama sonucunda gorunur', () => {
    const withNote = TX.map((t) => (t.id === '4' ? { ...t, note: 'sürpriz saç kremi' } : t))
    // id 4: Kuaför/Bakım -> Kişisel-Tuğçe (Tuğçe-DE Girokonto'dan odendi).
    expect(filterTransactions(withNote, { text: 'sürpriz' }, 'Tuğçe').map((r) => r.id)).toEqual([
      '4',
    ])
    expect(filterTransactions(withNote, { text: 'sürpriz' }, 'Can')).toEqual([])
    expect(filterTransactions(withNote, { text: 'sürpriz' })).toEqual([])
  })

  it('kisisel disi harcamanin notu herkese arama sonucunda gorunur', () => {
    const withNote = TX.map((t) => (t.id === '2' ? { ...t, note: 'haftalik market' } : t))
    expect(filterTransactions(withNote, { text: 'haftalik' }, 'Can').map((r) => r.id)).toEqual([
      '2',
    ])
    expect(filterTransactions(withNote, { text: 'haftalik' }, 'Tuğçe').map((r) => r.id)).toEqual([
      '2',
    ])
  })

  it('sumFilteredEUR filtrelenmis toplami verir', () => {
    const rows = filterTransactions(TX, { monthKey: '2026-09', account: 'Ortak Kasa' })
    expect(sumFilteredEUR(rows)).toBeCloseTo(720 + 48.9 + 39.9)
  })

  it('isEmptyFilter yalnizca ay secildiyse de bos sayar', () => {
    expect(isEmptyFilter({ monthKey: '2026-09' })).toBe(true)
    expect(isEmptyFilter({ monthKey: '2026-09', text: 'kira' })).toBe(false)
    expect(isEmptyFilter({ text: '   ' })).toBe(true)
  })
})
