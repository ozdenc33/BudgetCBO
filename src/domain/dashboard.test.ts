import { describe, expect, it } from 'vitest'
import {
  computeBudgetTypeSummary,
  computeCategoryBreakdown,
  computeControls,
  computeMonthSummary,
  computeMonthlyProgress,
  previousMonthKey,
} from './dashboard'
import { DEFAULT_SETTINGS } from './constants'
import type { Income, Transaction, Transfer } from './types'

// Ortak_Butce_v9.xlsx > Ozet sayfasi (secili ay: 2026-10) ile birebir
// karsilastirma. Kaynak veri Islemler!A4:S10, Gelirler!A4:K5,
// Transferler!A4:M6 (Faz 3 testleriyle ayni satirlar).

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
    date: '2026-10-03',
    description: 'Lidl haftalik market',
    category: 'Market (Ev)',
    amount: 62.4,
    currency: 'EUR',
    account: 'Can-DE Girokonto',
  },
  {
    id: '3',
    date: '2026-09-12',
    description: 'Mike kafes ve tasima cantasi',
    category: 'Kedi Evrak/Nakil',
    amount: 2400,
    currency: 'TRY',
    account: 'Can-TR Banka',
    canPct: 1,
  },
  {
    id: '4',
    date: '2026-10-11',
    description: 'Stuttgart muze gunu',
    category: 'Gezi/Müze',
    amount: 24,
    currency: 'EUR',
    account: 'Can-Nakit',
  },
  {
    id: '5',
    date: '2026-10-15',
    description: 'Fotoğraf filmi',
    category: 'Hobi/Fotoğraf',
    amount: 38.9,
    currency: 'EUR',
    account: 'Can-DE Girokonto',
    canPct: 1,
  },
  {
    id: '6',
    date: '2026-10-18',
    description: 'Mama 4 kg',
    category: 'Mama',
    amount: 31.5,
    currency: 'EUR',
    account: 'Tuğçe-DE Girokonto',
  },
  {
    id: '7',
    date: '2026-10-20',
    description: 'Kis montu',
    category: 'Giyim',
    amount: 89.99,
    currency: 'EUR',
    account: 'Tuğçe-DE Girokonto',
    tugcePct: 1,
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
  {
    id: '2',
    date: '2026-10-28',
    source: 'HiWi',
    person: 'Tuğçe',
    amount: 520,
    currency: 'EUR',
    account: 'Tuğçe-DE Girokonto',
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
  {
    id: '2',
    date: '2026-09-28',
    type: 'Ortak Kasa Katkısı',
    from: 'Tuğçe',
    to: 'Ortak Kasa',
    amount: 500,
    currency: 'EUR',
    fromAccount: 'Tuğçe-DE Girokonto',
    toAccount: 'Ortak Kasa',
  },
  {
    id: '3',
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

describe('previousMonthKey', () => {
  it('normal ay geçişi', () => {
    expect(previousMonthKey('2026-10')).toBe('2026-09')
  })
  it('yıl sınırı', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12')
  })
})

describe('computeBudgetTypeSummary — Ozet!A7:H12 (2026-10) ile karsilastirma', () => {
  const rows = computeBudgetTypeSummary('2026-10', TRANSACTIONS, DEFAULT_SETTINGS)

  function rowOf(bt: string) {
    return rows.find((r) => r.budgetType === bt)!
  }

  it('Ortak-Ev: 1012.40', () => {
    expect(rowOf('Ortak-Ev').spentEUR).toBeCloseTo(1012.4)
  })
  it('Ortak-Dışarı: 24', () => {
    expect(rowOf('Ortak-Dışarı').spentEUR).toBeCloseTo(24)
  })
  it('Kişisel-Can: 38.90', () => {
    expect(rowOf('Kişisel-Can').spentEUR).toBeCloseTo(38.9)
  })
  it('Kişisel-Tuğçe: 89.99', () => {
    expect(rowOf('Kişisel-Tuğçe').spentEUR).toBeCloseTo(89.99)
  })
  it('Mike: 31.50', () => {
    expect(rowOf('Mike').spentEUR).toBeCloseTo(31.5)
  })
  it('Taşınma: 0 (Eylul ayina ait)', () => {
    expect(rowOf('Taşınma').spentEUR).toBe(0)
  })
  it('limitsiz kategoride Kalan/Kullanim% (varsayilan ayarlarda limit 0)', () => {
    const ev = rowOf('Ortak-Ev')
    expect(ev.limitEUR).toBe(0)
    expect(ev.usagePct).toBeUndefined()
  })
  it('kategoriye limit tanimlanirsa butce tipine toplanir', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      categories: DEFAULT_SETTINGS.categories.map((c) =>
        c.name === 'Kira (Kaltmiete)' ? { ...c, monthlyLimitEUR: 1000 } : c,
      ),
    }
    const r = computeBudgetTypeSummary('2026-10', TRANSACTIONS, settings)
    const ev = r.find((x) => x.budgetType === 'Ortak-Ev')!
    expect(ev.limitEUR).toBe(1000)
    expect(ev.remainingEUR).toBeCloseTo(1000 - 1012.4)
    expect(ev.usagePct).toBeCloseTo(1012.4 / 1000)
  })
})

describe('computeCategoryBreakdown — Ozet kategori kirilimi (2026-10)', () => {
  const rows = computeCategoryBreakdown('2026-10', TRANSACTIONS, DEFAULT_SETTINGS)

  it('en buyuk kategori Kira (Kaltmiete), 950', () => {
    expect(rows[0].category.name).toBe('Kira (Kaltmiete)')
    expect(rows[0].spentEUR).toBe(950)
  })
  it('sadece harcamasi olan kategoriler listelenir', () => {
    expect(rows.every((r) => r.spentEUR > 0 || r.previousSpentEUR > 0)).toBe(true)
    expect(rows.some((r) => r.category.name === 'Nebenkosten')).toBe(false)
  })
  it('pay yuzdesi toplam harcamaya gore hesaplanir', () => {
    const kira = rows.find((r) => r.category.name === 'Kira (Kaltmiete)')!
    expect(kira.sharePct).toBeCloseTo(950 / 1196.79)
  })
})

describe('computeMonthSummary — Ozet!B16:B23 (2026-10) ile karsilastirma', () => {
  const summary = computeMonthSummary('2026-10', TRANSACTIONS, INCOMES, TRANSFERS, DEFAULT_SETTINGS)

  it('toplam gelir: 1512', () => {
    expect(summary.totalIncomeEUR).toBe(1512)
  })
  it('toplam harcama: 1196.79', () => {
    expect(summary.totalExpenseEUR).toBeCloseTo(1196.79)
  })
  it('tasarrufa aktarilan: 100', () => {
    expect(summary.savingsTransferredEUR).toBe(100)
  })
  it('net: 215.21', () => {
    expect(summary.netEUR).toBeCloseTo(215.21)
  })
  it('tasinma harici harcama: 1196.79 (tasinma harcamasi eylulde)', () => {
    expect(summary.nonMovingExpenseEUR).toBeCloseTo(1196.79)
  })
  it('tasarruf orani: 0.2084722...', () => {
    expect(summary.savingsRatePct).toBeCloseTo(0.208472222222222)
  })
})

describe('computeMonthlyProgress — Ozet!A42:J44', () => {
  const rows = computeMonthlyProgress(TRANSACTIONS, INCOMES, DEFAULT_SETTINGS)

  it('2026-09 ayinda sadece Tasinma harcamasi var, gelir yok', () => {
    const sep = rows.find((r) => r.monthKey === '2026-09')!
    expect(sep.byBudgetType['Taşınma']).toBe(50)
    expect(sep.totalEUR).toBe(50)
    expect(sep.incomeEUR).toBe(0)
    expect(sep.netEUR).toBe(-50)
  })

  it('2026-10 ayinda toplam 1196.79 harcama, 1512 gelir, net 315.21', () => {
    const oct = rows.find((r) => r.monthKey === '2026-10')!
    expect(oct.totalEUR).toBeCloseTo(1196.79)
    expect(oct.incomeEUR).toBe(1512)
    expect(oct.netEUR).toBeCloseTo(315.21)
  })
})

describe('computeControls — Ozet!N7:P13 (uygulanan alt kume)', () => {
  it('gecerli veriyle sadece TL kur kontrolu basarisiz olur (2026-09 icin kur girilmemis)', () => {
    const controls = computeControls(
      DEFAULT_SETTINGS.accounts,
      TRANSACTIONS,
      INCOMES,
      TRANSFERS,
      DEFAULT_SETTINGS,
    )
    const byLabel = Object.fromEntries(controls.map((c) => [c.label, c]))
    expect(byLabel['Hatalı işlem satırı'].ok).toBe(true)
    expect(byLabel['Hatalı transfer satırı'].ok).toBe(true)
    expect(byLabel['TL harcaması olup kuru girilmemiş ay'].ok).toBe(false)
    expect(byLabel['Ortak Kasa bakiye farkı'].ok).toBe(true)
  })

  it('2026-09 kuru girilince TL kur kontrolu OK olur', () => {
    const settings = { ...DEFAULT_SETTINGS, rates: { '2026-09': 48 } }
    const controls = computeControls(settings.accounts, TRANSACTIONS, INCOMES, TRANSFERS, settings)
    const byLabel = Object.fromEntries(controls.map((c) => [c.label, c]))
    expect(byLabel['TL harcaması olup kuru girilmemiş ay'].ok).toBe(true)
  })

  it('gecersiz bir islem satiri kontrolu kirmiziya cevirir', () => {
    const bad: Transaction[] = [
      ...TRANSACTIONS,
      {
        id: '8',
        date: '2026-10-01',
        description: 'x',
        category: 'Olmayan Kategori',
        amount: 5,
        currency: 'EUR',
        account: 'Can-Nakit',
      },
    ]
    const controls = computeControls(
      DEFAULT_SETTINGS.accounts,
      bad,
      INCOMES,
      TRANSFERS,
      DEFAULT_SETTINGS,
    )
    const byLabel = Object.fromEntries(controls.map((c) => [c.label, c]))
    expect(byLabel['Hatalı işlem satırı'].ok).toBe(false)
  })

  it('Ortak Kasa transferi yanlis hedef hesaba giderse fark kontrolu kirmiziya cevirir', () => {
    const badTransfers: Transfer[] = [
      ...TRANSFERS,
      {
        id: '4',
        date: '2026-10-01',
        type: 'Ortak Kasa Katkısı',
        from: 'Can',
        to: 'Ortak Kasa',
        amount: 200,
        currency: 'EUR',
        fromAccount: 'Can-DE Girokonto',
        toAccount: 'Can-Tasarruf',
      },
    ]
    const controls = computeControls(
      DEFAULT_SETTINGS.accounts,
      TRANSACTIONS,
      INCOMES,
      badTransfers,
      DEFAULT_SETTINGS,
    )
    const byLabel = Object.fromEntries(controls.map((c) => [c.label, c]))
    expect(byLabel['Ortak Kasa bakiye farkı'].ok).toBe(false)
  })
})
