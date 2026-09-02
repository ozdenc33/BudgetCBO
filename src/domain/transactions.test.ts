import { describe, expect, it } from 'vitest'
import { computeTransaction } from './transactions'
import { DEFAULT_SETTINGS } from './constants'
import type { Transaction } from './types'

// Bu satirlar Ortak_Butce_v9.xlsx > Islemler sayfasindaki gercek
// ornek satirlardir (A4:S9). Beklenen degerler o satirlarin gri
// (formul) kolonlarindaki gercek hesaplanmis degerlerdir. Amac:
// computeTransaction'in Excel'le birebir ayni sonucu uretmesini
// garanti etmek.

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 'x',
    date: '',
    description: '',
    category: '',
    amount: 0,
    currency: 'EUR',
    account: '',
    ...partial,
  }
}

describe('computeTransaction — Islemler A4:S9 ile karsilastirma', () => {
  it('satir 4: Ekim kira, Ortak Kasa, EUR — yari yariya', () => {
    const c = computeTransaction(
      tx({
        date: '2026-10-01',
        description: 'Ekim kira',
        category: 'Kira (Kaltmiete)',
        amount: 950,
        currency: 'EUR',
        account: 'Ortak Kasa',
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.rate).toBe(1)
    expect(c.amountEUR).toBe(950)
    expect(c.payer).toBe('Ortak Kasa')
    expect(c.budgetType).toBe('Ortak-Ev')
    expect(c.canShare).toBe(475)
    expect(c.tugceShare).toBe(475)
  })

  it('satir 5: Lidl market, Can hesabindan, ortak kategori — yine yari yariya', () => {
    const c = computeTransaction(
      tx({
        date: '2026-10-03',
        description: 'Lidl haftalik market',
        category: 'Market (Ev)',
        amount: 62.4,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.payer).toBe('Can')
    expect(c.budgetType).toBe('Ortak-Ev')
    expect(c.canShare).toBeCloseTo(31.2)
    expect(c.tugceShare).toBeCloseTo(31.2)
  })

  it('satir 6: TRY harcama, Tasinma kategorisi, Can % = 1 — varsayilan kurla cevrilir', () => {
    const c = computeTransaction(
      tx({
        date: '2026-09-12',
        description: 'Mike kafes ve tasima cantasi',
        category: 'Kedi Evrak/Nakil',
        amount: 2400,
        currency: 'TRY',
        account: 'Can-TR Banka',
        canPct: 1,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.rateSource).toBe('default')
    expect(c.rate).toBe(48)
    expect(c.amountEUR).toBe(50)
    expect(c.budgetType).toBe('Taşınma')
    expect(c.canShare).toBe(50)
    expect(c.tugceShare).toBe(0)
  })

  it('satir 7: Muze gezisi, ortak-disari kategori — yari yariya', () => {
    const c = computeTransaction(
      tx({
        date: '2026-10-11',
        description: 'Stuttgart muze gunu',
        category: 'Gezi/Müze',
        amount: 24,
        currency: 'EUR',
        account: 'Can-Nakit',
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.budgetType).toBe('Ortak-Dışarı')
    expect(c.canShare).toBe(12)
    expect(c.tugceShare).toBe(12)
  })

  it('satir 8: kisisel kategori, Can % = 1 — Kisisel-Can, tamami Can payi', () => {
    const c = computeTransaction(
      tx({
        date: '2026-10-15',
        description: 'Fotoğraf filmi',
        category: 'Hobi/Fotoğraf',
        amount: 38.9,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
        canPct: 1,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.budgetType).toBe('Kişisel-Can')
    expect(c.canShare).toBeCloseTo(38.9)
    expect(c.tugceShare).toBe(0)
  })

  it('satir 9: Mike kategorisi, Tugce hesabindan — yari yariya', () => {
    const c = computeTransaction(
      tx({
        date: '2026-10-18',
        description: 'Mama 4 kg',
        category: 'Mama',
        amount: 31.5,
        currency: 'EUR',
        account: 'Tuğçe-DE Girokonto',
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.payer).toBe('Tuğçe')
    expect(c.budgetType).toBe('Mike')
    expect(c.canShare).toBeCloseTo(15.75)
    expect(c.tugceShare).toBeCloseTo(15.75)
  })

  it('satir 10: kisisel kategori, Tugce % = 1 — Kisisel-Tugce, tamami Tugce payi', () => {
    const c = computeTransaction(
      tx({
        date: '2026-10-20',
        description: 'Kis montu',
        category: 'Giyim',
        amount: 89.99,
        currency: 'EUR',
        account: 'Tuğçe-DE Girokonto',
        tugcePct: 1,
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.validation).toBe('OK')
    expect(c.payer).toBe('Tuğçe')
    expect(c.budgetType).toBe('Kişisel-Tuğçe')
    expect(c.canShare).toBe(0)
    expect(c.tugceShare).toBeCloseTo(89.99)
  })
})

describe('computeTransaction — dogrulama kurallari (bolum 5)', () => {
  const base = tx({
    date: '2026-10-01',
    category: 'Market (Ev)',
    amount: 10,
    account: 'Can-DE Girokonto',
  })

  it('kategori/tutar/hesap eksikse hata verir', () => {
    const c = computeTransaction(tx({ date: '2026-10-01' }), DEFAULT_SETTINGS)
    expect(c.validation).toBe('Eksik alan: kategori, tutar veya hesap')
  })

  it('kategori listede yoksa hata verir', () => {
    const c = computeTransaction({ ...base, category: 'Olmayan Kategori' }, DEFAULT_SETTINGS)
    expect(c.validation).toBe('Kategori listede yok')
  })

  it('hesap listede yoksa hata verir', () => {
    const c = computeTransaction({ ...base, account: 'Olmayan Hesap' }, DEFAULT_SETTINGS)
    expect(c.validation).toBe('Hesap listede yok')
  })

  it('can % ve tugce % toplami 100 degilse hata verir', () => {
    const c = computeTransaction({ ...base, canPct: 0.5, tugcePct: 0.6 }, DEFAULT_SETTINGS)
    expect(c.validation).toBe('Can % ve Tuğçe % toplamı 100 olmalı, birini boş bırakın')
  })

  it('can % ve tugce % toplami 100 ise (yuvarlama toleransiyla) hata vermez', () => {
    const c = computeTransaction({ ...base, canPct: 0.7, tugcePct: 0.3 }, DEFAULT_SETTINGS)
    expect(c.validation).toBe('OK')
  })

  it('kisisel kategoride oran 0 veya 1 degilse "Paylasim eksik" hatasi verir', () => {
    const c = computeTransaction(
      { ...base, category: 'Giyim', account: 'Ortak Kasa' },
      DEFAULT_SETTINGS,
    )
    expect(c.budgetType).toBe('Paylaşım eksik')
    expect(c.validation).toBe('Kişisel harcamada Can % veya Tuğçe % 100 yazın')
  })

  it('bos satir (tarih yok) icin dogrulama mesaji bos doner', () => {
    const c = computeTransaction(tx({}), DEFAULT_SETTINGS)
    expect(c.validation).toBe('')
  })
})

describe('computeTransaction — para birimi ve kur', () => {
  it('para birimi bossa EUR kabul edilir, kur 1 olur', () => {
    const c = computeTransaction(
      tx({
        date: '2026-10-01',
        category: 'Market (Ev)',
        amount: 20,
        account: 'Can-Nakit',
        currency: '',
      }),
      DEFAULT_SETTINGS,
    )
    expect(c.rate).toBe(1)
    expect(c.amountEUR).toBe(20)
  })

  it('o ay icin kur girilmisse aylik kur kullanilir', () => {
    const settings = { ...DEFAULT_SETTINGS, rates: { '2026-10': 40 } }
    const c = computeTransaction(
      tx({
        date: '2026-10-05',
        category: 'Market (Ev)',
        amount: 400,
        currency: 'TRY',
        account: 'Can-TR Banka',
      }),
      settings,
    )
    expect(c.rateSource).toBe('monthly')
    expect(c.rate).toBe(40)
    expect(c.amountEUR).toBe(10)
  })
})
