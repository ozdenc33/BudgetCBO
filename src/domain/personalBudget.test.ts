import { describe, expect, it } from 'vitest'
import { computePersonalBudget } from './personalBudget'
import { DEFAULT_SETTINGS } from './constants'
import type { Income, RecurringItem, Transaction, Transfer } from './types'

// Butce_Can / Butce_Tugce ve Ozet!A29:H30 (secili ay: 2026-10) ile
// birebir karsilastirma. Ayni fixture Faz 3/4/5 testleriyle ayni.
const TODAY = new Date(Date.UTC(2026, 8, 2)) // 2026-09-02, gercek ay != secili ay

const TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-10-01', description: 'Ekim kira', category: 'Kira (Kaltmiete)', amount: 950, currency: 'EUR', account: 'Ortak Kasa' },
  { id: '2', date: '2026-10-03', description: 'Lidl haftalik market', category: 'Market (Ev)', amount: 62.4, currency: 'EUR', account: 'Can-DE Girokonto' },
  { id: '3', date: '2026-09-12', description: 'Mike kafes ve tasima cantasi', category: 'Kedi Evrak/Nakil', amount: 2400, currency: 'TRY', account: 'Can-TR Banka', canPct: 1 },
  { id: '4', date: '2026-10-11', description: 'Stuttgart muze gunu', category: 'Gezi/Müze', amount: 24, currency: 'EUR', account: 'Can-Nakit' },
  { id: '5', date: '2026-10-15', description: 'Fotoğraf filmi', category: 'Hobi/Fotoğraf', amount: 38.9, currency: 'EUR', account: 'Can-DE Girokonto', canPct: 1 },
  { id: '6', date: '2026-10-18', description: 'Mama 4 kg', category: 'Mama', amount: 31.5, currency: 'EUR', account: 'Tuğçe-DE Girokonto' },
  { id: '7', date: '2026-10-20', description: 'Kis montu', category: 'Giyim', amount: 89.99, currency: 'EUR', account: 'Tuğçe-DE Girokonto', tugcePct: 1 },
]

const INCOMES: Income[] = [
  { id: '1', date: '2026-10-05', source: 'Sperrkonto', person: 'Can', amount: 992, currency: 'EUR', account: 'Can-DE Girokonto' },
  { id: '2', date: '2026-10-28', source: 'HiWi', person: 'Tuğçe', amount: 520, currency: 'EUR', account: 'Tuğçe-DE Girokonto' },
]

const TRANSFERS: Transfer[] = [
  { id: '1', date: '2026-09-28', type: 'Ortak Kasa Katkısı', from: 'Can', to: 'Ortak Kasa', amount: 500, currency: 'EUR', fromAccount: 'Can-DE Girokonto', toAccount: 'Ortak Kasa' },
  { id: '2', date: '2026-09-28', type: 'Ortak Kasa Katkısı', from: 'Tuğçe', to: 'Ortak Kasa', amount: 500, currency: 'EUR', fromAccount: 'Tuğçe-DE Girokonto', toAccount: 'Ortak Kasa' },
  { id: '3', date: '2026-10-30', type: 'Tasarruf', from: 'Can', to: 'Acil Durum Fonu', amount: 100, currency: 'EUR', fromAccount: 'Can-DE Girokonto', toAccount: 'Can-Tasarruf' },
]

const emptyPlan = DEFAULT_SETTINGS.personalPlans.Can

describe('computePersonalBudget — Butce_Can (secili ay: 2026-10, plan bos)', () => {
  const b = computePersonalBudget('Can', '2026-10', emptyPlan, TRANSACTIONS, INCOMES, TRANSFERS, [], DEFAULT_SETTINGS, TODAY)

  it('gelir: plan 0, gerceklesen 992, fark 992 (Butce_Can!C15/D15)', () => {
    expect(b.income.plannedEUR).toBe(0)
    expect(b.income.actualEUR).toBe(992)
    expect(b.income.diffEUR).toBe(992)
  })

  it('ortak pay: gerceklesen 533.95, kalan -533.95 (Butce_Can!C19/D19)', () => {
    expect(b.sharedContribution.actualEUR).toBeCloseTo(533.95)
    expect(b.sharedContribution.remainingEUR).toBeCloseTo(-533.95)
  })

  it('kisisel harcama: gerceklesen 38.9, kalan -38.9 (Butce_Can!C38/D38)', () => {
    expect(b.personalCategories.actualEUR).toBeCloseTo(38.9)
    expect(b.personalCategories.remainingEUR).toBeCloseTo(-38.9)
  })

  it('plan girilmemis kategoride Kalan/Kullanim% tanimsizdir', () => {
    const hobi = b.personalCategories.rows.find((r) => r.category === 'Hobi/Fotoğraf')!
    expect(hobi.actualEUR).toBeCloseTo(38.9)
    expect(hobi.remainingEUR).toBeUndefined()
    expect(hobi.usagePct).toBeUndefined()
  })

  it('tasarruf: gerceklesen 100, fark 100 (Butce_Can!C43/D43)', () => {
    expect(b.savings.actualEUR).toBe(100)
    expect(b.savings.diffEUR).toBe(100)
  })

  it('SONUÇ: sharedContributionDiff/personalCategoriesDiff Fark isareti Kalan\'in tersidir (Butce_Can!D48/D49)', () => {
    expect(b.summary.sharedContributionDiffEUR).toBeCloseTo(533.95)
    expect(b.summary.personalCategoriesDiffEUR).toBeCloseTo(38.9)
  })

  it('net gerceklesen 319.15 (Butce_Can!C51 / Ozet!F29)', () => {
    expect(b.summary.netPlannedEUR).toBe(0)
    expect(b.summary.netActualEUR).toBeCloseTo(319.15)
  })

  it('plan sifir oldugu icin "sifir bazli plan tamam" durumu (Butce_Can!C53)', () => {
    expect(b.unassignedStatus).toBe('tamam')
  })

  it('plan gelir 0 oldugu icin harcanabilir kalan tanimsizdir (Butce_Can!B54)', () => {
    expect(b.spendableThisMonthEUR).toBeUndefined()
    expect(b.dailySpendableEUR).toBeUndefined()
  })

  it('tasarruf orani 0.1008064... (Butce_Can!B56)', () => {
    expect(b.savingsRatePct).toBeCloseTo(0.100806451612903)
  })

  it('secili ay gercek "bugunku" ay olmadigindan kalan gun tanimsizdir (Butce_Can!B3="-")', () => {
    expect(b.remainingDaysInMonth).toBeUndefined()
  })
})

describe('computePersonalBudget — Butce_Tugce (secili ay: 2026-10, plan bos)', () => {
  const b = computePersonalBudget('Tuğçe', '2026-10', emptyPlan, TRANSACTIONS, INCOMES, TRANSFERS, [], DEFAULT_SETTINGS, TODAY)

  it('gelir: 520 (Butce_Tugce!C15)', () => {
    expect(b.income.actualEUR).toBe(520)
  })

  it('ortak pay: 533.95 (Butce_Tugce!C19)', () => {
    expect(b.sharedContribution.actualEUR).toBeCloseTo(533.95)
  })

  it('kisisel harcama: 89.99 (Butce_Tugce!C38, Giyim)', () => {
    expect(b.personalCategories.actualEUR).toBeCloseTo(89.99)
  })

  it('tasarruf: 0 (bu ay Tugce tasarruf transferi yok)', () => {
    expect(b.savings.actualEUR).toBe(0)
  })

  it('net gerceklesen -103.94 (Butce_Tugce!C51 / Ozet!F30)', () => {
    expect(b.summary.netActualEUR).toBeCloseTo(-103.94)
  })

  it('tasarruf orani 0 (gerceklesen tasarruf sifir)', () => {
    expect(b.savingsRatePct).toBe(0)
  })
})

describe('computePersonalBudget — kalan gun ve gunluk harcanabilir (gercek "bugunku" ay)', () => {
  it('secili ay = gercek bugunku ay ise kalan gun hesaplanir', () => {
    const plan = { ...emptyPlan, incomePlan: { Sperrkonto: 992 } }
    const b = computePersonalBudget('Can', '2026-09', plan, TRANSACTIONS, INCOMES, TRANSFERS, [], DEFAULT_SETTINGS, TODAY)
    // 2026-09-02: eylul 30 gun cekiyor, kalan = 30-2 = 28
    expect(b.remainingDaysInMonth).toBe(28)
  })
})

describe('computePersonalBudget — ortak sabit gider / kategori limiti onerileri', () => {
  it('sadece Ortak-Ev ve Mike tipi aktif sabit giderler yariya bolunur', () => {
    const recurring: RecurringItem[] = [
      { id: 'kira', name: 'Kira', budgetType: 'Ortak-Ev', category: 'Kira (Kaltmiete)', amount: 900, frequencyMonths: 1, account: 'Ortak Kasa', firstPaymentDate: '2026-10-01', active: true },
      { id: 'mama', name: 'Mama', budgetType: 'Mike', category: 'Mama', amount: 60, frequencyMonths: 1, account: 'Ortak Kasa', firstPaymentDate: '2026-10-01', active: true },
      { id: 'disari', name: 'Bir sey', budgetType: 'Ortak-Dışarı', category: 'Restoran/Kafe', amount: 1000, frequencyMonths: 1, account: 'Ortak Kasa', firstPaymentDate: '2026-10-01', active: true },
      { id: 'pasif', name: 'Pasif kalem', budgetType: 'Ortak-Ev', category: 'Internet', amount: 500, frequencyMonths: 1, account: 'Ortak Kasa', firstPaymentDate: '2026-10-01', active: false },
    ]
    const b = computePersonalBudget('Can', '2026-10', emptyPlan, [], [], [], recurring, DEFAULT_SETTINGS, TODAY)
    // (900 + 60) / 2 = 480; Ortak-Disari ve pasif kalem haric tutulur.
    expect(b.sharedContribution.suggestionHalfFixedEUR).toBeCloseTo(480)
  })

  it('ortak kategori limitlerinin toplami yariya bolunur', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      categories: DEFAULT_SETTINGS.categories.map((c) =>
        c.name === 'Kira (Kaltmiete)' ? { ...c, monthlyLimitEUR: 1000 } : c,
      ),
    }
    const b = computePersonalBudget('Can', '2026-10', emptyPlan, [], [], [], [], settings, TODAY)
    expect(b.sharedContribution.suggestionHalfCategoryLimitEUR).toBeCloseTo(500)
  })
})
