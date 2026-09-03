import { describe, expect, it } from 'vitest'
import {
  computeAccountBalances,
  computeAccountCurrencyBalances,
  computePersonNetWorth,
  netWorth,
} from './balances'
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

describe('computeAccountBalances — bolusuk cekilis (secondAccount)', () => {
  it('secondAccount yoksa eski davranis: tum tutar tek hesaptan cikar', () => {
    const tx: Transaction[] = [
      {
        id: '1',
        date: '2026-10-01',
        description: 'Market',
        category: 'Market (Ev)',
        amount: 100,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
      },
    ]
    const balances = computeAccountBalances(DEFAULT_SETTINGS.accounts, tx, [], [], DEFAULT_SETTINGS)
    expect(balances.find((b) => b.account.name === 'Can-DE Girokonto')?.expensesEUR).toBe(100)
    expect(balances.find((b) => b.account.name === 'Tuğçe-DE Girokonto')?.expensesEUR).toBe(0)
  })

  it('secondAccount varsa, cekilen oran canPct/tugcePct ile birebir aynidir', () => {
    const tx: Transaction[] = [
      {
        id: '1',
        date: '2026-10-01',
        description: 'Ortak market',
        category: 'Market (Ev)',
        amount: 100,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
        secondAccount: 'Tuğçe-DE Girokonto',
        canPct: 0.7,
        tugcePct: 0.3,
      },
    ]
    const balances = computeAccountBalances(DEFAULT_SETTINGS.accounts, tx, [], [], DEFAULT_SETTINGS)
    expect(balances.find((b) => b.account.name === 'Can-DE Girokonto')?.expensesEUR).toBeCloseTo(70)
    expect(balances.find((b) => b.account.name === 'Tuğçe-DE Girokonto')?.expensesEUR).toBeCloseTo(
      30,
    )
  })

  it('secondAccount, account ile ayniysa (orn. ikisi de Ortak Kasa) tek hesap gibi davranir', () => {
    const tx: Transaction[] = [
      {
        id: '1',
        date: '2026-10-01',
        description: 'Ortak market',
        category: 'Market (Ev)',
        amount: 100,
        currency: 'EUR',
        account: 'Ortak Kasa',
        secondAccount: 'Ortak Kasa',
        canPct: 0.5,
        tugcePct: 0.5,
      },
    ]
    const balances = computeAccountBalances(DEFAULT_SETTINGS.accounts, tx, [], [], DEFAULT_SETTINGS)
    expect(balances.find((b) => b.account.name === 'Ortak Kasa')?.expensesEUR).toBe(100)
  })

  it('toplam iki hesaba dagilan pay, tek hesaptan cekilen orijinal tutara esittir', () => {
    const tx: Transaction[] = [
      {
        id: '1',
        date: '2026-10-01',
        description: 'Ortak market',
        category: 'Market (Ev)',
        amount: 77.5,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
        secondAccount: 'Tuğçe-DE Girokonto',
        canPct: 0.4,
        tugcePct: 0.6,
      },
    ]
    const balances = computeAccountBalances(DEFAULT_SETTINGS.accounts, tx, [], [], DEFAULT_SETTINGS)
    const canExpense = balances.find((b) => b.account.name === 'Can-DE Girokonto')?.expensesEUR ?? 0
    const tugceExpense =
      balances.find((b) => b.account.name === 'Tuğçe-DE Girokonto')?.expensesEUR ?? 0
    expect(canExpense + tugceExpense).toBeCloseTo(77.5)
  })
})

describe('computeAccountCurrencyBalances — hesapta kac TL, kac EUR var', () => {
  it('EUR ve TRY hareketleri ayri ayri toplanir, birbirine cevrilmez', () => {
    const tx: Transaction[] = [
      {
        id: '1',
        date: '2026-10-01',
        description: 'EUR harcama',
        category: 'Market (Ev)',
        amount: 40,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
      },
      {
        id: '2',
        date: '2026-10-02',
        description: 'TL harcama',
        category: 'Market (Ev)',
        amount: 350,
        currency: 'TRY',
        account: 'Can-DE Girokonto',
      },
    ]
    const income: Income[] = [
      {
        id: 'i1',
        date: '2026-10-01',
        source: 'KYK',
        person: 'Can',
        amount: 5000,
        currency: 'TRY',
        account: 'Can-DE Girokonto',
      },
    ]
    const [balance] = computeAccountCurrencyBalances(
      [DEFAULT_SETTINGS.accounts.find((a) => a.name === 'Can-DE Girokonto')!],
      tx,
      income,
      [],
      DEFAULT_SETTINGS,
    )
    expect(balance.nativeByCurrency.EUR).toBeCloseTo(-40)
    expect(balance.nativeByCurrency.TRY).toBeCloseTo(5000 - 350)
    // liveEquivalentEUR = -40 + 4650/defaultRate
    expect(balance.liveEquivalentEUR).toBeCloseTo(-40 + 4650 / DEFAULT_SETTINGS.defaultRate)
  })

  it('bolusuk cekiliste ham TL/EUR tutari da orana gore bolunur', () => {
    const tx: Transaction[] = [
      {
        id: '1',
        date: '2026-10-01',
        description: 'Ortak market TL',
        category: 'Market (Ev)',
        amount: 1000,
        currency: 'TRY',
        account: 'Can-DE Girokonto',
        secondAccount: 'Tuğçe-DE Girokonto',
        canPct: 0.25,
        tugcePct: 0.75,
      },
    ]
    const balances = computeAccountCurrencyBalances(
      DEFAULT_SETTINGS.accounts,
      tx,
      [],
      [],
      DEFAULT_SETTINGS,
    )
    const can = balances.find((b) => b.account.name === 'Can-DE Girokonto')!
    const tugce = balances.find((b) => b.account.name === 'Tuğçe-DE Girokonto')!
    expect(can.nativeByCurrency.TRY).toBeCloseTo(-250)
    expect(tugce.nativeByCurrency.TRY).toBeCloseTo(-750)
  })
})

describe('computePersonNetWorth — mal varligi', () => {
  it('kendi hesaplarinin toplami + Ortak Kasa payinin yarisi', () => {
    const result = computePersonNetWorth(
      DEFAULT_SETTINGS.accounts,
      TRANSACTIONS,
      INCOMES,
      TRANSFERS,
      DEFAULT_SETTINGS,
    )
    const can = result.find((r) => r.person === 'Can')!
    const balances = computeAccountBalances(
      DEFAULT_SETTINGS.accounts,
      TRANSACTIONS,
      INCOMES,
      TRANSFERS,
      DEFAULT_SETTINGS,
    )
    const ortakKasaEUR = balances.find((b) => b.account.name === 'Ortak Kasa')!.balanceEUR
    expect(can.ortakKasaShareEUR).toBeCloseTo(ortakKasaEUR / 2)
    expect(can.ownAccountsTotalEUR).toBeCloseTo(
      can.ownAccounts.reduce((sum, a) => sum + a.balanceEUR, 0),
    )
    expect(can.totalEUR).toBeCloseTo(can.ownAccountsTotalEUR + can.ortakKasaShareEUR)
  })

  it('Ortak Kasa kendi hesaplari listesinde gorunmez (sahibi kisi degil)', () => {
    const [can] = computePersonNetWorth(
      DEFAULT_SETTINGS.accounts,
      TRANSACTIONS,
      INCOMES,
      TRANSFERS,
      DEFAULT_SETTINGS,
    )
    expect(can.ownAccounts.some((a) => a.account.name === 'Ortak Kasa')).toBe(false)
  })

  it('Can ve Tuğçe icin ikisi de doner', () => {
    const result = computePersonNetWorth(
      DEFAULT_SETTINGS.accounts,
      TRANSACTIONS,
      INCOMES,
      TRANSFERS,
      DEFAULT_SETTINGS,
    )
    expect(result.map((r) => r.person).sort()).toEqual(['Can', 'Tuğçe'])
  })
})
