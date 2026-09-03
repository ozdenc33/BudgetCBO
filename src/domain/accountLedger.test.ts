import { describe, expect, it } from 'vitest'
import { computeAccountLedger, computeSavingsBreakdown } from './accountLedger'
import { computeAccountBalances } from './balances'
import { DEFAULT_SETTINGS } from './constants'
import type { Income, Transaction, Transfer } from './types'

const CAN = 'Can-DE Girokonto'
const TASARRUF = 'Can-Tasarruf'

const TX: Transaction[] = [
  {
    id: 't1',
    date: '2026-09-02',
    description: 'Market',
    category: 'Market (Ev)',
    amount: 50,
    currency: 'EUR',
    account: CAN,
  },
  {
    id: 't2',
    date: '2026-09-05',
    description: 'Kahve',
    category: 'Restoran/Kafe',
    amount: 10,
    currency: 'EUR',
    account: CAN,
  },
  {
    id: 't3',
    date: '2026-09-06',
    description: 'Baska hesap',
    category: 'Market (Ev)',
    amount: 99,
    currency: 'EUR',
    account: 'Tuğçe-Nakit',
  },
]

const INCOMES: Income[] = [
  {
    id: 'i1',
    date: '2026-09-01',
    source: 'Werkstudent',
    person: 'Can',
    amount: 1000,
    currency: 'EUR',
    account: CAN,
  },
]

const TRANSFERS: Transfer[] = [
  {
    id: 'r1',
    date: '2026-09-03',
    type: 'Tasarruf',
    from: 'Can',
    to: 'Acil Durum Fonu',
    amount: 200,
    currency: 'EUR',
    fromAccount: CAN,
    toAccount: TASARRUF,
  },
  {
    id: 'r2',
    date: '2026-09-04',
    type: 'Tasarruf',
    from: 'Tuğçe',
    to: 'Acil Durum Fonu',
    amount: 100,
    currency: 'EUR',
    fromAccount: 'Tuğçe-DE Girokonto',
    toAccount: TASARRUF,
  },
  {
    id: 'r3',
    date: '2026-09-07',
    type: 'Tasarruf',
    from: 'Can',
    to: 'Kamera',
    amount: 300,
    currency: 'EUR',
    fromAccount: CAN,
    toAccount: TASARRUF,
  },
]

describe('computeAccountLedger', () => {
  it('yalnizca o hesabin hareketlerini alir', () => {
    const rows = computeAccountLedger(CAN, TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(rows.some((r) => r.label === 'Baska hesap')).toBe(false)
  })

  it('gelir, harcama ve transfer cikisini isaretli tutarla listeler', () => {
    const rows = computeAccountLedger(CAN, TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    expect(byId['in-i1'].amountEUR).toBe(1000)
    expect(byId['tx-t1'].amountEUR).toBe(-50)
    expect(byId['tr-out-r1'].amountEUR).toBe(-200)
  })

  it('en yeni hareket ustte olur', () => {
    const rows = computeAccountLedger(CAN, TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(rows[0].date).toBe('2026-09-07')
    expect(rows[rows.length - 1].date).toBe('2026-09-01')
  })

  it('yurutulen bakiye dogru ilerler', () => {
    const rows = computeAccountLedger(CAN, TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    expect(byId['in-i1'].balanceAfterEUR).toBe(1000) // +1000
    expect(byId['tx-t1'].balanceAfterEUR).toBe(950) // -50
    expect(byId['tr-out-r1'].balanceAfterEUR).toBe(750) // -200
    expect(byId['tx-t2'].balanceAfterEUR).toBe(740) // -10
    expect(byId['tr-out-r3'].balanceAfterEUR).toBe(440) // -300
  })

  it('son yurutulen bakiye, Hesap Bakiyeleri sayfasindaki bakiyeyle ayni olur', () => {
    const rows = computeAccountLedger(CAN, TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    const balances = computeAccountBalances(
      DEFAULT_SETTINGS.accounts,
      TX,
      INCOMES,
      TRANSFERS,
      DEFAULT_SETTINGS,
    )
    const can = balances.find((b) => b.account.name === CAN)!
    expect(rows[0].balanceAfterEUR).toBeCloseTo(can.balanceEUR)
  })

  it('transfer giris hedef hesapta arti olarak gorunur', () => {
    const rows = computeAccountLedger(TASARRUF, TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(rows.every((r) => r.amountEUR > 0)).toBe(true)
    expect(rows[0].balanceAfterEUR).toBeCloseTo(600)
  })

  it('hicbir hareketi olmayan hesap icin bos liste doner', () => {
    expect(computeAccountLedger('Can-Nakit', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)).toEqual([])
  })
})

describe('computeSavingsBreakdown', () => {
  it('hedeflere gore kirar ve buyukten kucuge siralar', () => {
    const b = computeSavingsBreakdown(TASARRUF, TRANSFERS, DEFAULT_SETTINGS, 600)
    expect(b.goals.map((g) => g.goalName)).toEqual(['Acil Durum Fonu', 'Kamera'])
    expect(b.goals[0].totalEUR).toBeCloseTo(300)
    expect(b.goals[1].totalEUR).toBeCloseTo(300)
  })

  it('her hedefte kimin ne kadar attigini gosterir', () => {
    const b = computeSavingsBreakdown(TASARRUF, TRANSFERS, DEFAULT_SETTINGS, 600)
    const acil = b.goals.find((g) => g.goalName === 'Acil Durum Fonu')!
    expect(acil.contributions).toEqual([
      { person: 'Can', amountEUR: 200 },
      { person: 'Tuğçe', amountEUR: 100 },
    ])
  })

  it('atanmis ve atanmamis tutari ayirir', () => {
    const b = computeSavingsBreakdown(TASARRUF, TRANSFERS, DEFAULT_SETTINGS, 600)
    expect(b.assignedEUR).toBeCloseTo(600)
    expect(b.unassignedEUR).toBeCloseTo(0)
  })

  it('hedefe bagli olmayan bakiye "atanmamis" olarak cikar', () => {
    // Hesapta 1.000 € var ama yalnizca 600 €'su hedeflere atanmis
    const b = computeSavingsBreakdown(TASARRUF, TRANSFERS, DEFAULT_SETTINGS, 1000)
    expect(b.assignedEUR).toBeCloseTo(600)
    expect(b.unassignedEUR).toBeCloseTo(400)
  })

  it('tasarruf disindaki transferleri saymaz', () => {
    const withKatki: Transfer[] = [
      ...TRANSFERS,
      {
        id: 'r4',
        date: '2026-09-08',
        type: 'Ortak Kasa Katkısı',
        from: 'Can',
        to: 'Ortak Kasa',
        amount: 500,
        currency: 'EUR',
        fromAccount: CAN,
        toAccount: TASARRUF,
      },
    ]
    const b = computeSavingsBreakdown(TASARRUF, withKatki, DEFAULT_SETTINGS, 1100)
    expect(b.assignedEUR).toBeCloseTo(600)
  })
})
