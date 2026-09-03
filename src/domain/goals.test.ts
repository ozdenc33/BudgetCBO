import { describe, expect, it } from 'vitest'
import { computeGoals } from './goals'
import { DEFAULT_SETTINGS } from './constants'
import type { Goal, Transfer } from './types'

// Hedefler!A4:L6 gercek satirlaridir. "today" 2026-09-02 (bu depoyu
// hazirladigimiz gun, Excel'in kendi TODAY() hesabiyla ayni).
const TODAY = new Date(Date.UTC(2026, 8, 2))

const GOALS: Goal[] = [
  {
    id: 'acil',
    name: 'Acil Durum Fonu',
    owner: 'Ortak',
    targetAmount: 2000,
    targetDate: '2027-06-30',
    note: 'Örnek satır: 3 aylık ortak sabit gider',
  },
  { id: 'turkiye', name: 'Türkiye Ziyareti 2027', owner: 'Ortak' },
  { id: 'kamera', name: 'Kamera Lens', owner: 'Can' },
]

const TRANSFERS: Transfer[] = [
  {
    id: '1',
    date: '2026-10-30',
    type: 'Tasarruf',
    from: 'Can',
    to: 'Acil Durum Fonu',
    amount: 100,
    currency: 'EUR',
    fromAccount: 'Can-DE Girokonto',
    toAccount: 'Can-Tasarruf',
  },
]

describe('computeGoals — Hedefler!A4:L6 (today=2026-09-02) ile karsilastirma', () => {
  const computed = computeGoals(GOALS, TRANSFERS, DEFAULT_SETTINGS, TODAY)

  it('Acil Durum Fonu: biriken 100, kalan 1900, ilerleme %5', () => {
    const g = computed.find((x) => x.id === 'acil')!
    expect(g.accumulatedEUR).toBe(100)
    expect(g.remainingEUR).toBe(1900)
    expect(g.progressPct).toBeCloseTo(0.05)
  })

  it('Acil Durum Fonu: kalan ay 10, aylık gereken 190', () => {
    const g = computed.find((x) => x.id === 'acil')!
    expect(g.remainingMonths).toBe(10)
    expect(g.monthlyRequiredEUR).toBeCloseTo(190)
  })

  it('Acil Durum Fonu: Can katkısı 100, Tuğçe katkısı 0', () => {
    const g = computed.find((x) => x.id === 'acil')!
    expect(g.canContributionEUR).toBe(100)
    expect(g.tugceContributionEUR).toBe(0)
  })

  it('hedef tutar/tarih girilmemis hedeflerde ilgili alanlar tanimsizdir', () => {
    const g = computed.find((x) => x.id === 'turkiye')!
    expect(g.accumulatedEUR).toBe(0)
    expect(g.remainingEUR).toBeUndefined()
    expect(g.progressPct).toBeUndefined()
    expect(g.remainingMonths).toBeUndefined()
    expect(g.monthlyRequiredEUR).toBeUndefined()
  })

  it('TOPLAM (Hedefler!C12/E12/F12/J12/K12): 2000 / 100 / 1900 / 100 / 0', () => {
    const totalTarget = computed.reduce((s, g) => s + (g.targetAmount ?? 0), 0)
    const totalAccumulated = computed.reduce((s, g) => s + g.accumulatedEUR, 0)
    const totalRemaining = computed.reduce((s, g) => s + (g.remainingEUR ?? 0), 0)
    const totalCan = computed.reduce((s, g) => s + g.canContributionEUR, 0)
    const totalTugce = computed.reduce((s, g) => s + g.tugceContributionEUR, 0)
    expect(totalTarget).toBe(2000)
    expect(totalAccumulated).toBe(100)
    expect(totalRemaining).toBe(1900)
    expect(totalCan).toBe(100)
    expect(totalTugce).toBe(0)
  })
})
