import { describe, expect, it } from 'vitest'
import { computeReminders } from './reminders'
import { DEFAULT_SETTINGS } from './constants'
import type { RecurringItem, Transaction } from './types'

function item(partial: Partial<RecurringItem>): RecurringItem {
  return {
    id: 'x',
    name: 'Test',
    budgetType: 'Ortak-Ev',
    category: 'Internet',
    frequencyMonths: 1,
    account: 'Ortak Kasa',
    firstPaymentDate: '2026-10-01',
    active: true,
    ...partial,
  }
}

describe('computeReminders — yaklasan odemeler', () => {
  it('7 gun icinde odemesi olan aktif kalemler listelenir', () => {
    const today = new Date(2026, 8, 2) // 2026-09-02
    const soon = item({
      id: 'soon',
      name: 'Yakin odeme',
      firstPaymentDate: '2026-09-05',
      frequencyMonths: 1,
    })
    const far = item({
      id: 'far',
      name: 'Uzak odeme',
      firstPaymentDate: '2026-10-01',
      frequencyMonths: 1,
    })
    const { upcoming } = computeReminders([soon, far], [], DEFAULT_SETTINGS, today)
    expect(upcoming.map((r) => r.id)).toEqual(['soon'])
  })

  it('pasif kalemler yaklasan listesine girmez', () => {
    const today = new Date(2026, 8, 2)
    const soonInactive = item({
      id: 'soon-inactive',
      firstPaymentDate: '2026-09-05',
      active: false,
    })
    const { upcoming } = computeReminders([soonInactive], [], DEFAULT_SETTINGS, today)
    expect(upcoming).toHaveLength(0)
  })
})

describe('computeReminders — ay sonunda onaylanmamis taslaklar', () => {
  it('ay sonuna 5 gun ve altinda ise EKSIK kalemler listelenir', () => {
    const today = new Date(2026, 8, 27) // 2026-09-27, eylul 30 gun cekiyor -> kalan 3 gun
    const eksik = item({
      id: 'eksik',
      category: 'Internet',
      firstPaymentDate: '2026-09-01',
      frequencyMonths: 1,
    })
    const { unconfirmedNearMonthEnd } = computeReminders([eksik], [], DEFAULT_SETTINGS, today)
    expect(unconfirmedNearMonthEnd.map((r) => r.id)).toEqual(['eksik'])
  })

  it('ay sonuna hala gun varsa (5 gunden fazla) uyari verilmez', () => {
    const today = new Date(2026, 8, 2) // 2026-09-02, kalan 28 gun
    const eksik = item({
      id: 'eksik',
      category: 'Internet',
      firstPaymentDate: '2026-09-01',
      frequencyMonths: 1,
    })
    const { unconfirmedNearMonthEnd } = computeReminders([eksik], [], DEFAULT_SETTINGS, today)
    expect(unconfirmedNearMonthEnd).toHaveLength(0)
  })

  it('bu ay zaten girilmisse (Girildi) ay sonu uyarisina girmez', () => {
    const today = new Date(2026, 8, 27)
    const girildi = item({
      id: 'girildi',
      category: 'Internet',
      firstPaymentDate: '2026-09-01',
      frequencyMonths: 1,
    })
    const transactions = [
      {
        id: 't1',
        date: '2026-09-05',
        description: 'Internet',
        category: 'Internet',
        amount: 30,
        currency: 'EUR' as const,
        account: 'Ortak Kasa',
      },
    ]
    const { unconfirmedNearMonthEnd } = computeReminders(
      [girildi],
      transactions,
      DEFAULT_SETTINGS,
      today,
    )
    expect(unconfirmedNearMonthEnd).toHaveLength(0)
  })
})

describe('computeReminders — gecikmis (odeme gunu gecmis, hala girilmemis)', () => {
  const kira = (over: Partial<RecurringItem> = {}): RecurringItem => ({
    id: 'r1',
    name: 'Kira',
    budgetType: 'Ortak-Ev',
    category: 'Kira (Kaltmiete)',
    amount: 720,
    frequencyMonths: 1,
    account: 'Ortak Kasa',
    firstPaymentDate: '2026-07-01',
    active: true,
    ...over,
  })

  it('ayin 1inde odenmesi gereken kalem ayin 10unda girilmemisse gecikmis sayilir', () => {
    const r = computeReminders([kira()], [], DEFAULT_SETTINGS, new Date('2026-09-10T12:00:00'))
    expect(r.overdue.map((x) => x.name)).toEqual(['Kira'])
  })

  it('odeme gunu henuz gelmediyse gecikmis sayilmaz', () => {
    const r = computeReminders(
      [kira({ firstPaymentDate: '2026-07-20' })],
      [],
      DEFAULT_SETTINGS,
      new Date('2026-09-10T12:00:00'),
    )
    expect(r.overdue).toEqual([])
  })

  it('o ay girildiyse gecikmis sayilmaz', () => {
    const entered: Transaction[] = [
      {
        id: 't1',
        date: '2026-09-01',
        description: 'Kira',
        category: 'Kira (Kaltmiete)',
        amount: 720,
        currency: 'EUR',
        account: 'Ortak Kasa',
      },
    ]
    const r = computeReminders([kira()], entered, DEFAULT_SETTINGS, new Date('2026-09-10T12:00:00'))
    expect(r.overdue).toEqual([])
  })

  it('ay sonu beklenmez: ayin 10unda da uyarir (eski davranista bos kalirdi)', () => {
    const today = new Date('2026-09-10T12:00:00')
    const r = computeReminders([kira()], [], DEFAULT_SETTINGS, today)
    expect(r.unconfirmedNearMonthEnd).toEqual([])
    expect(r.overdue.length).toBe(1)
  })
})
