import { describe, expect, it } from 'vitest'
import { computeTransfer } from './transfers'
import { DEFAULT_SETTINGS } from './constants'
import type { Transfer } from './types'

// Transferler!A4:M6 gercek satirlaridir.

function transfer(partial: Partial<Transfer>): Transfer {
  return {
    id: 'x',
    date: '',
    type: 'Ortak Kasa Katkısı',
    from: '',
    to: '',
    amount: 0,
    currency: 'EUR',
    fromAccount: '',
    toAccount: '',
    ...partial,
  }
}

describe('computeTransfer — Transferler A4:M6 ile karsilastirma', () => {
  it('satir 4: Can, Ortak Kasa Katkısı', () => {
    const c = computeTransfer(
      transfer({
        date: '2026-09-28',
        type: 'Ortak Kasa Katkısı',
        from: 'Can',
        to: 'Ortak Kasa',
        amount: 500,
        fromAccount: 'Can-DE Girokonto',
        toAccount: 'Ortak Kasa',
        note: 'Ekim kira icin',
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.amountEUR).toBe(500)
    expect(c.monthKey).toBe('2026-09')
  })

  it('satir 6: Can, Tasarruf, hedef adina', () => {
    const c = computeTransfer(
      transfer({
        date: '2026-10-30',
        type: 'Tasarruf',
        from: 'Can',
        to: 'Acil Durum Fonu',
        amount: 100,
        fromAccount: 'Can-DE Girokonto',
        toAccount: 'Can-Tasarruf',
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.amountEUR).toBe(100)
  })
})

describe('computeTransfer — dogrulama kurallari (bolum 5 / Transferler!M)', () => {
  it('Ortak Kasa Katkısı, alici Ortak Kasa degilse hata verir', () => {
    const c = computeTransfer(
      transfer({
        date: '2026-10-01',
        type: 'Ortak Kasa Katkısı',
        from: 'Can',
        to: 'Tuğçe',
        amount: 100,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('Alıcı Ortak Kasa olmalı')
  })

  it('Kisiden Kisiye, alici Ortak Kasa ise hata verir', () => {
    const c = computeTransfer(
      transfer({
        date: '2026-10-01',
        type: 'Kişiden Kişiye',
        from: 'Can',
        to: 'Ortak Kasa',
        amount: 100,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('Alıcı diğer kişi olmalı')
  })

  it('Kisiden Kisiye, alici gonderenle ayniysa hata verir', () => {
    const c = computeTransfer(
      transfer({
        date: '2026-10-01',
        type: 'Kişiden Kişiye',
        from: 'Can',
        to: 'Can',
        amount: 100,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('Alıcı diğer kişi olmalı')
  })

  it('Kisiden Kisiye, gecerli farkli kisiyse OK doner', () => {
    const c = computeTransfer(
      transfer({
        date: '2026-10-01',
        type: 'Kişiden Kişiye',
        from: 'Can',
        to: 'Tuğçe',
        amount: 100,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
  })

  it('Tasarruf, alici Can/Tugce/Ortak Kasa ise hata verir', () => {
    const c = computeTransfer(
      transfer({
        date: '2026-10-01',
        type: 'Tasarruf',
        from: 'Can',
        to: 'Tuğçe',
        amount: 100,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('Alıcı bir hedef olmalı')
  })

  it('eksik alan varsa hata verir', () => {
    const c = computeTransfer(transfer({ date: '2026-10-01' }), DEFAULT_SETTINGS)
    expect(c.validation).toBe('Eksik alan')
  })

  it('bos satir icin dogrulama mesaji bos doner', () => {
    const c = computeTransfer(transfer({}), DEFAULT_SETTINGS)
    expect(c.validation).toBe('')
  })
})
