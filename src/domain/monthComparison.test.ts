import { describe, expect, it } from 'vitest'
import { computeMonthComparison } from './monthComparison'
import { DEFAULT_SETTINGS } from './constants'
import type { Income, Transaction, Transfer } from './types'

const settings = { ...DEFAULT_SETTINGS, defaultRate: 35 }

function tx(
  id: string,
  date: string,
  category: string,
  amount: number,
  account = 'Ortak Kasa',
): Transaction {
  return { id, date, description: '', category, amount, currency: 'EUR', account }
}

const transactions: Transaction[] = [
  // Temmuz (onceki ay)
  tx('a', '2026-07-05', 'Market (Ev)', 200),
  tx('b', '2026-07-10', 'Restoran/Kafe', 100),
  // Giyim "Kişisel" tipte: Ortak Kasa'dan odenirse paylasim belirsiz
  // kalir ve hicbir butce tipine girmez. Can'in hesabindan odeniyor.
  tx('c', '2026-07-15', 'Giyim', 80, 'Can-DE Girokonto'),
  // Agustos (secili ay)
  tx('d', '2026-08-05', 'Market (Ev)', 260),
  tx('e', '2026-08-12', 'Restoran/Kafe', 40),
]

const incomes: Income[] = [
  {
    id: 'i1',
    date: '2026-07-01',
    source: 'Maaş',
    person: 'Can',
    amount: 1000,
    currency: 'EUR',
    account: 'Can-DE Girokonto',
  },
  {
    id: 'i2',
    date: '2026-08-01',
    source: 'Maaş',
    person: 'Can',
    amount: 1200,
    currency: 'EUR',
    account: 'Can-DE Girokonto',
  },
]

const transfers: Transfer[] = [
  {
    id: 'tr1',
    date: '2026-08-03',
    type: 'Tasarruf',
    from: 'Can',
    to: 'Yaz tatili',
    amount: 150,
    currency: 'EUR',
    fromAccount: 'Can-DE Girokonto',
    toAccount: 'Can-Tasarruf',
  },
]

describe('computeMonthComparison', () => {
  const result = computeMonthComparison('2026-08', transactions, incomes, transfers, settings)

  it('onceki ayi dogru secer', () => {
    expect(result.previousMonthKey).toBe('2026-07')
  })

  it('harcama farkini hesaplar', () => {
    // Agustos 300, Temmuz 380
    expect(result.expense.currentEUR).toBe(300)
    expect(result.expense.previousEUR).toBe(380)
    expect(result.expense.deltaEUR).toBe(-80)
    expect(result.expense.deltaPct).toBeCloseTo(-80 / 380)
  })

  it('gelir farkini hesaplar', () => {
    expect(result.income.deltaEUR).toBe(200)
  })

  it('tasarruf farkini hesaplar', () => {
    expect(result.savings.currentEUR).toBe(150)
    expect(result.savings.previousEUR).toBe(0)
    expect(result.savings.deltaPct).toBeUndefined()
  })

  it('en cok artan kategoriyi bulur', () => {
    expect(result.biggestIncreases[0]).toMatchObject({ category: 'Market (Ev)', deltaEUR: 60 })
  })

  it('en cok azalan kategorileri buyukten kucuge siralar', () => {
    expect(result.biggestDecreases.map((d) => d.category)).toEqual(['Giyim', 'Restoran/Kafe'])
    expect(result.biggestDecreases[0].deltaEUR).toBe(-80)
    expect(result.biggestDecreases[1].deltaEUR).toBe(-60)
  })

  it('butce tipi kirilimini toplar', () => {
    const ev = result.byBudgetType.find((b) => b.budgetType === 'Ortak-Ev')
    expect(ev).toMatchObject({ currentEUR: 260, previousEUR: 200, deltaEUR: 60 })
  })

  it('onceki ay hic kayit yoksa yuzde tanimsiz kalir', () => {
    const empty = computeMonthComparison('2026-07', [transactions[0]], [], [], settings)
    expect(empty.expense.previousEUR).toBe(0)
    expect(empty.expense.deltaPct).toBeUndefined()
  })
})
