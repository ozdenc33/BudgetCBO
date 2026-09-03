import { describe, expect, it } from 'vitest'
import { computeBudgetAlerts, findNegativeBalances } from './budgetAlerts'
import type { BudgetTypeRow } from './dashboard'

function row(partial: Partial<BudgetTypeRow>): BudgetTypeRow {
  return {
    budgetType: 'Ortak-Ev',
    spentEUR: 0,
    limitEUR: 0,
    remainingEUR: 0,
    usagePct: undefined,
    previousSpentEUR: 0,
    changeEUR: 0,
    sharePct: undefined,
    ...partial,
  }
}

describe('computeBudgetAlerts', () => {
  it('limiti girilmemis satir hic uyarmaz', () => {
    expect(computeBudgetAlerts([row({ spentEUR: 5000, limitEUR: 0, usagePct: undefined })])).toEqual([])
  })

  it('limitin altinda kalan (%79) uyarmaz', () => {
    expect(computeBudgetAlerts([row({ spentEUR: 790, limitEUR: 1000, usagePct: 0.79 })])).toEqual([])
  })

  it('%80 esiginde "yaklasti" uyarisi verir ve kalani hesaplar', () => {
    const [alert] = computeBudgetAlerts([row({ spentEUR: 800, limitEUR: 1000, usagePct: 0.8 })])
    expect(alert.level).toBe('yaklasti')
    expect(alert.deltaEUR).toBeCloseTo(200)
  })

  it('limit asilinca "asildi" uyarisi verir ve asan tutari hesaplar', () => {
    const [alert] = computeBudgetAlerts([row({ spentEUR: 1150, limitEUR: 1000, usagePct: 1.15 })])
    expect(alert.level).toBe('asildi')
    expect(alert.deltaEUR).toBeCloseTo(150)
  })

  it('tam limitte (%100) henuz asilmis sayilmaz', () => {
    const [alert] = computeBudgetAlerts([row({ spentEUR: 1000, limitEUR: 1000, usagePct: 1 })])
    expect(alert.level).toBe('yaklasti')
    expect(alert.deltaEUR).toBe(0)
  })

  it('en yuksek kullanim basta olacak sekilde siralar', () => {
    const alerts = computeBudgetAlerts([
      row({ budgetType: 'Ortak-Ev', spentEUR: 850, limitEUR: 1000, usagePct: 0.85 }),
      row({ budgetType: 'Mike', spentEUR: 130, limitEUR: 100, usagePct: 1.3 }),
      row({ budgetType: 'Ortak-Dışarı', spentEUR: 95, limitEUR: 100, usagePct: 0.95 }),
    ])
    expect(alerts.map((a) => a.budgetType)).toEqual(['Mike', 'Ortak-Dışarı', 'Ortak-Ev'])
  })
})

describe('findNegativeBalances', () => {
  const balance = (name: string, balanceEUR: number) =>
    ({
      account: { id: name, name, currency: 'EUR' as const, owner: 'Ortak Kasa' as const },
      incomesEUR: 0,
      expensesEUR: 0,
      transfersOutEUR: 0,
      transfersInEUR: 0,
      balanceEUR,
    })

  it('yalnizca eksideki hesaplari dondurur', () => {
    const rows = findNegativeBalances([balance('Ortak Kasa', -190.08), balance('Can-Nakit', 0), balance('Can-Tasarruf', 350)])
    expect(rows.map((r) => r.account.name)).toEqual(['Ortak Kasa'])
  })

  it('en cok eksideki hesabi basa koyar', () => {
    const rows = findNegativeBalances([balance('A', -10), balance('B', -500), balance('C', -80)])
    expect(rows.map((r) => r.account.name)).toEqual(['B', 'C', 'A'])
  })

  it('hepsi artidaysa bos dizi doner', () => {
    expect(findNegativeBalances([balance('A', 10), balance('B', 0)])).toEqual([])
  })
})
