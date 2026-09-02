import { describe, expect, it } from 'vitest'
import { computeAccountBalances, netWorth } from './balances'
import { DEFAULT_SETTINGS } from './constants'
import type { Income, Transaction, Transfer } from './types'

// Ortak_Butce_v9.xlsx > Hesaplar!A4:H13 ile birebir karsilastirma.
// Kaynak veri: Islemler!A4:S10 (7 satir), Gelirler!A4:K5 (2 satir),
// Transferler!A4:M6 (3 satir).

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

describe('computeAccountBalances — Hesaplar!A4:H13 ile karsilastirma', () => {
  const balances = computeAccountBalances(
    DEFAULT_SETTINGS.accounts,
    TRANSACTIONS,
    INCOMES,
    TRANSFERS,
    DEFAULT_SETTINGS,
  )

  function balanceOf(name: string) {
    return balances.find((b) => b.account.name === name)?.balanceEUR
  }

  it('Can-DE Girokonto: 290.70', () => {
    expect(balanceOf('Can-DE Girokonto')).toBeCloseTo(290.7)
  })

  it('Can-TR Banka: -50', () => {
    expect(balanceOf('Can-TR Banka')).toBeCloseTo(-50)
  })

  it('Can-Tasarruf: 100', () => {
    expect(balanceOf('Can-Tasarruf')).toBeCloseTo(100)
  })

  it('Can-Nakit: -24', () => {
    expect(balanceOf('Can-Nakit')).toBeCloseTo(-24)
  })

  it('Tuğçe-DE Girokonto: -101.49', () => {
    expect(balanceOf('Tuğçe-DE Girokonto')).toBeCloseTo(-101.49)
  })

  it('Tuğçe-Tasarruf: 0', () => {
    expect(balanceOf('Tuğçe-Tasarruf')).toBeCloseTo(0)
  })

  it('Tuğçe-Nakit: 0', () => {
    expect(balanceOf('Tuğçe-Nakit')).toBeCloseTo(0)
  })

  it('Ortak Kasa: 50', () => {
    expect(balanceOf('Ortak Kasa')).toBeCloseTo(50)
  })

  it('net varlik (Hesaplar!H13): 265.21', () => {
    expect(netWorth(balances)).toBeCloseTo(265.21)
  })
})
