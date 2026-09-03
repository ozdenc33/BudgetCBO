import { describe, expect, it } from 'vitest'
import { computeIncome } from './incomes'
import { DEFAULT_SETTINGS } from './constants'
import type { Income } from './types'

// Gelirler!A4:K5 gercek satirlaridir.

describe('computeIncome — Gelirler A4:K5 ile karsilastirma', () => {
  it('satir 4: Sperrkonto, Can, EUR', () => {
    const c = computeIncome(
      {
        id: 'x',
        date: '2026-10-05',
        source: 'Sperrkonto',
        person: 'Can',
        amount: 992,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
        note: 'Aylık serbest tutar',
      },
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.rate).toBe(1)
    expect(c.amountEUR).toBe(992)
    expect(c.monthKey).toBe('2026-10')
  })

  it('satir 5: HiWi, Tuğçe, EUR', () => {
    const c = computeIncome(
      {
        id: 'x',
        date: '2026-10-28',
        source: 'HiWi',
        person: 'Tuğçe',
        amount: 520,
        currency: 'EUR',
        account: 'Tuğçe-DE Girokonto',
      },
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.amountEUR).toBe(520)
  })
})

describe('computeIncome — dogrulama', () => {
  it('kaynak/kisi/tutar/hesap eksikse hata verir', () => {
    const c = computeIncome(
      {
        id: 'x',
        date: '2026-10-01',
        source: '',
        person: 'Can',
        amount: 0,
        currency: 'EUR',
        account: '',
      },
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('Eksik alan: kaynak, kişi, tutar veya hesap')
  })

  it('bos satir icin dogrulama mesaji bos doner', () => {
    const c = computeIncome(
      { id: 'x', date: '', source: '', person: 'Can', amount: 0, currency: 'EUR', account: '' },
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('')
  })

  it('tum alanlar doluysa hesap/kaynak listede olmasa da OK doner (Excel de dogrulamiyor)', () => {
    const income: Income = {
      id: 'x',
      date: '2026-10-01',
      source: 'Bilinmeyen Kaynak',
      person: 'Can',
      amount: 10,
      currency: 'EUR',
      account: 'Bilinmeyen Hesap',
    }
    const c = computeIncome(income, DEFAULT_SETTINGS)
    expect(c.validation).toBe('OK')
  })
})
