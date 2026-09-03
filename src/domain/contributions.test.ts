import { describe, expect, it } from 'vitest'
import {
  computeContributionSummary,
  contributionCheckEUR,
  contributionStatus,
} from './contributions'
import { DEFAULT_SETTINGS } from './constants'
import type { Income, Transaction, Transfer } from './types'

// Hesaplar!A23:F29 (KATKI OZETI) ile birebir karsilastirma. Ayni
// fixture Faz 3/4/5 testleriyle ayni (Islemler!A4:S10, Gelirler!A4:K5,
// Transferler!A4:M6).
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

describe('computeContributionSummary — Hesaplar!A25:F26 ile karsilastirma', () => {
  const rows = computeContributionSummary(
    DEFAULT_SETTINGS.accounts,
    TRANSACTIONS,
    INCOMES,
    TRANSFERS,
    DEFAULT_SETTINGS,
  )
  const can = rows.find((r) => r.person === 'Can')!
  const tugce = rows.find((r) => r.person === 'Tuğçe')!

  it('Can: dogrudan odedigi 175.30 (Hesaplar!B25)', () => {
    expect(can.directlyPaidEUR).toBeCloseTo(175.3)
  })

  it('Can: Ortak Kasaya koydugu 500 (Hesaplar!C25)', () => {
    expect(can.paidIntoSharedAccountEUR).toBe(500)
  })

  it('Can: toplam katki 675.30 (Hesaplar!D25)', () => {
    expect(can.totalContributionEUR).toBeCloseTo(675.3)
  })

  it('Can: kendi payi 622.85 (Hesaplar!E25)', () => {
    expect(can.ownShareEUR).toBeCloseTo(622.85)
  })

  it('Can: fark 27.45 (Hesaplar!F25)', () => {
    expect(can.diffEUR).toBeCloseTo(27.45)
  })

  it('Tugce: dogrudan odedigi 121.49 (Hesaplar!B26)', () => {
    expect(tugce.directlyPaidEUR).toBeCloseTo(121.49)
  })

  it('Tugce: toplam katki 621.49 (Hesaplar!D26)', () => {
    expect(tugce.totalContributionEUR).toBeCloseTo(621.49)
  })

  it('Tugce: kendi payi 623.94 (Hesaplar!E26)', () => {
    expect(tugce.ownShareEUR).toBeCloseTo(623.94)
  })

  it('Tugce: fark -27.45 (Hesaplar!F26)', () => {
    expect(tugce.diffEUR).toBeCloseTo(-27.45)
  })

  it('kontrol: iki farkin toplami sifir (Hesaplar!F29)', () => {
    expect(contributionCheckEUR(rows)).toBeCloseTo(0)
  })

  it('durum: Can 27.45 EUR onde, borc dili kullanilmaz (Hesaplar!B28)', () => {
    const status = contributionStatus(rows)
    expect(status.balanced).toBe(false)
    if (!status.balanced) {
      expect(status.aheadPerson).toBe('Can')
      expect(status.amountEUR).toBeCloseTo(27.45)
    }
  })
})

describe('contributionStatus — esit durumda', () => {
  it('iki fark da sifirsa dengede sayilir', () => {
    const rows = [
      {
        person: 'Can' as const,
        directlyPaidEUR: 0,
        paidIntoSharedAccountEUR: 0,
        totalContributionEUR: 0,
        ownShareEUR: 0,
        diffEUR: 0,
      },
      {
        person: 'Tuğçe' as const,
        directlyPaidEUR: 0,
        paidIntoSharedAccountEUR: 0,
        totalContributionEUR: 0,
        ownShareEUR: 0,
        diffEUR: 0,
      },
    ]
    expect(contributionStatus(rows)).toEqual({ balanced: true })
  })
})
