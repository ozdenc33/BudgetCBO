import { describe, expect, it } from 'vitest'
import { exportWorkbook } from './excelExport'
import { parseWorkbookBuffer } from './excelImport'
import { DEFAULT_SETTINGS } from './constants'
import type { Goal, Income, RecurringItem, Transaction, Transfer } from './types'

// Disa Aktar (yedek) ile Ice Aktar ayni kolon duzenini kullanmali,
// aksi halde yedek dosyasi geri yuklenemez. Bu test tam turu (export ->
// import) dogrular.

const TODAY = new Date(2026, 8, 2)

const TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2026-10-01',
    description: 'Ekim kira',
    category: 'Kira (Kaltmiete)',
    amount: 950,
    currency: 'EUR',
    account: 'Ortak Kasa',
  },
  {
    id: '2',
    date: '2026-10-15',
    description: 'Fotoğraf filmi',
    category: 'Hobi/Fotoğraf',
    amount: 38.9,
    currency: 'EUR',
    account: 'Can-DE Girokonto',
    canPct: 1,
    tag: 'Stuttgart',
  },
]
const INCOMES: Income[] = [
  {
    id: '1',
    date: '2026-10-05',
    source: 'Sperrkonto',
    person: 'Can',
    amount: 992,
    currency: 'EUR',
    account: 'Can-DE Girokonto',
  },
]
const TRANSFERS: Transfer[] = [
  {
    id: '1',
    date: '2026-09-28',
    type: 'Ortak Kasa Katkısı',
    from: 'Can',
    to: 'Ortak Kasa',
    amount: 500,
    currency: 'EUR',
    fromAccount: 'Can-DE Girokonto',
    toAccount: 'Ortak Kasa',
  },
]
const RECURRING: RecurringItem[] = [
  {
    id: '1',
    name: 'Kira (Kaltmiete)',
    budgetType: 'Ortak-Ev',
    category: 'Kira (Kaltmiete)',
    amount: 950,
    frequencyMonths: 1,
    account: 'Ortak Kasa',
    firstPaymentDate: '2026-10-01',
    active: true,
  },
]
const GOALS: Goal[] = [
  {
    id: '1',
    name: 'Acil Durum Fonu',
    owner: 'Ortak',
    targetAmount: 2000,
    targetDate: '2027-06-30',
  },
]

describe('excelExport -> excelImport round-trip', () => {
  it('disa aktarilan dosya ice aktarma ile ayni verileri geri verir', async () => {
    const blob = await exportWorkbook({
      transactions: TRANSACTIONS,
      incomes: INCOMES,
      transfers: TRANSFERS,
      recurring: RECURRING,
      goals: GOALS,
      settings: DEFAULT_SETTINGS,
      today: TODAY,
    })
    const buffer = await blob.arrayBuffer()
    const result = await parseWorkbookBuffer(buffer)

    expect(result.transactions).toHaveLength(2)
    const kira = result.transactions.find((t) => t.description === 'Ekim kira')!
    expect(kira.date).toBe('2026-10-01')
    expect(kira.category).toBe('Kira (Kaltmiete)')
    expect(kira.amount).toBe(950)
    expect(kira.account).toBe('Ortak Kasa')
    const foto = result.transactions.find((t) => t.description === 'Fotoğraf filmi')!
    expect(foto.canPct).toBe(1)
    expect(foto.tag).toBe('Stuttgart')

    expect(result.incomes).toHaveLength(1)
    expect(result.incomes[0].source).toBe('Sperrkonto')
    expect(result.incomes[0].amount).toBe(992)

    expect(result.transfers).toHaveLength(1)
    expect(result.transfers[0].type).toBe('Ortak Kasa Katkısı')
    expect(result.transfers[0].fromAccount).toBe('Can-DE Girokonto')
    expect(result.transfers[0].toAccount).toBe('Ortak Kasa')

    expect(result.recurring).toHaveLength(1)
    expect(result.recurring[0].name).toBe('Kira (Kaltmiete)')
    expect(result.recurring[0].amount).toBe(950)
    expect(result.recurring[0].active).toBe(true)

    expect(result.goals).toHaveLength(1)
    expect(result.goals[0].name).toBe('Acil Durum Fonu')
    expect(result.goals[0].targetAmount).toBe(2000)
    expect(result.goals[0].targetDate).toBe('2027-06-30')
  })
})
