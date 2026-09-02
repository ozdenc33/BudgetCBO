import { describe, expect, it } from 'vitest'
import { computeRecurringItems, draftTransactionsForMonth, nextPaymentDate } from './recurring'
import { DEFAULT_SETTINGS } from './constants'
import type { RecurringItem, Transaction } from './types'

// Sabit_Giderler!A4:N19 gercek satirlaridir. Excel dosyasindaki
// formuller "today" olarak 2026-09-02'yi kullanmisti (bu depoyu
// hazirladigimiz gun), bu yuzden testler de ayni tarihi kullanir.
const TODAY = new Date(Date.UTC(2026, 8, 2)) // 2026-09-02

function item(partial: Partial<RecurringItem>): RecurringItem {
  return {
    id: 'x',
    name: '',
    budgetType: 'Ortak-Ev',
    category: '',
    frequencyMonths: 1,
    account: 'Ortak Kasa',
    firstPaymentDate: '2026-10-01',
    active: true,
    ...partial,
  }
}

const KIRA = item({
  id: 'kira',
  name: 'Kira (Kaltmiete)',
  budgetType: 'Ortak-Ev',
  category: 'Kira (Kaltmiete)',
  frequencyMonths: 1,
  account: 'Ortak Kasa',
  firstPaymentDate: '2026-10-01',
})

const NEBENKOSTEN = item({
  id: 'nebenkosten',
  name: 'Nebenkosten',
  budgetType: 'Ortak-Ev',
  category: 'Nebenkosten',
  frequencyMonths: 1,
  account: 'Ortak Kasa',
  firstPaymentDate: '2026-10-01',
})

const RUNDFUNK = item({
  id: 'rundfunk',
  name: 'Rundfunkbeitrag',
  budgetType: 'Ortak-Ev',
  category: 'Rundfunkbeitrag',
  frequencyMonths: 3,
  account: 'Ortak Kasa',
  firstPaymentDate: '2026-11-15',
})

const SEMESTER_CAN = item({
  id: 'semester-can',
  name: 'Semester Beitrag TUM (Can)',
  budgetType: 'Kişisel-Can',
  category: 'Semester Beitrag',
  frequencyMonths: 6,
  account: 'Can-DE Girokonto',
  firstPaymentDate: '2026-09-01',
})

// Ayni Butce+Kategori ikilisini paylasan iki kalem — Kilavuz!B24'teki
// "TK ve Privathaftpflicht birlikte kontrol edilir" ornegi.
const TK = item({
  id: 'tk',
  name: 'TK Krankenversicherung (Can)',
  budgetType: 'Kişisel-Can',
  category: 'Sigorta',
  frequencyMonths: 1,
  account: 'Can-DE Girokonto',
  firstPaymentDate: '2026-10-01',
})
const PRIVATHAFTPFLICHT = item({
  id: 'privathaftpflicht',
  name: 'Privathaftpflicht (Can)',
  budgetType: 'Kişisel-Can',
  category: 'Sigorta',
  frequencyMonths: 12,
  account: 'Can-DE Girokonto',
  firstPaymentDate: '2026-10-01',
})

describe('nextPaymentDate — Sabit_Giderler!J (TODAY=2026-09-02)', () => {
  it('Kira: aylik, ilk odeme 2026-10-01 — sonraki odeme 2026-10-01, 29 gun kaldi', () => {
    expect(nextPaymentDate(KIRA, TODAY)).toBe('2026-10-01')
  })

  it('Rundfunkbeitrag: 3 ayda bir, ilk odeme 2026-11-15 — sonraki odeme degismez', () => {
    expect(nextPaymentDate(RUNDFUNK, TODAY)).toBe('2026-11-15')
  })

  it('Semester Beitrag: 6 ayda bir, ilk odeme 2026-09-01 (bugunden once) — bir sonraki donguye atlar', () => {
    expect(nextPaymentDate(SEMESTER_CAN, TODAY)).toBe('2027-03-01')
  })

  it('pasif kalem icin sonraki odeme yoktur', () => {
    expect(nextPaymentDate(item({ active: false }), TODAY)).toBeUndefined()
  })
})

describe('computeRecurringItems — Sabit_Giderler!M (secili ay: 2026-10)', () => {
  it('Kira bu ay girildi (Islemler eslesmesi var)', () => {
    const transactions: Transaction[] = [
      { id: 't1', date: '2026-10-01', description: 'Ekim kira', category: 'Kira (Kaltmiete)', amount: 950, currency: 'EUR', account: 'Ortak Kasa' },
    ]
    const [c] = computeRecurringItems([KIRA], '2026-10', transactions, DEFAULT_SETTINGS, TODAY)
    expect(c.monthStatus).toBe('girildi')
    expect(c.enteredThisMonthEUR).toBe(950)
  })

  it('Nebenkosten bu ay girilmedi — EKSIK', () => {
    const [c] = computeRecurringItems([NEBENKOSTEN], '2026-10', [], DEFAULT_SETTINGS, TODAY)
    expect(c.monthStatus).toBe('eksik')
  })

  it('Rundfunkbeitrag bu ay vadesi degil (ilk odeme kasimda, 3 ayda bir)', () => {
    const [c] = computeRecurringItems([RUNDFUNK], '2026-10', [], DEFAULT_SETTINGS, TODAY)
    expect(c.monthStatus).toBe('vadesi-degil')
  })

  it('Semester Beitrag bu ay vadesi degil (6 ayda bir, ilk odeme eylulde)', () => {
    const [c] = computeRecurringItems([SEMESTER_CAN], '2026-10', [], DEFAULT_SETTINGS, TODAY)
    expect(c.monthStatus).toBe('vadesi-degil')
  })

  it('pasif kalem her zaman "pasif" doner', () => {
    const [c] = computeRecurringItems([item({ active: false })], '2026-10', [], DEFAULT_SETTINGS, TODAY)
    expect(c.monthStatus).toBe('pasif')
  })

  it('ayni Butce+Kategori ikilisini paylasan iki kalemden biri girilirse ikisi de "girildi" sayilir', () => {
    const transactions: Transaction[] = [
      { id: 't1', date: '2026-10-05', description: 'TK sigorta', category: 'Sigorta', amount: 45, currency: 'EUR', account: 'Can-DE Girokonto' },
    ]
    const computed = computeRecurringItems([TK, PRIVATHAFTPFLICHT], '2026-10', transactions, DEFAULT_SETTINGS, TODAY)
    // Privathaftpflicht 12 ayda bir, ilk odeme 2026-10-01 -> bu ay vadesi geliyor.
    expect(computed.find((c) => c.id === 'tk')!.monthStatus).toBe('girildi')
    expect(computed.find((c) => c.id === 'privathaftpflicht')!.monthStatus).toBe('girildi')
  })
})

describe('draftTransactionsForMonth — Sabit_Giderler!Q:X (secili ay: 2026-10)', () => {
  it('sadece EKSIK kalemler icin taslak uretir, tarihi ilk odeme gunune kirpar', () => {
    const drafts = draftTransactionsForMonth(
      [KIRA, NEBENKOSTEN],
      '2026-10',
      [
        { id: 't1', date: '2026-10-01', description: 'Ekim kira', category: 'Kira (Kaltmiete)', amount: 950, currency: 'EUR', account: 'Ortak Kasa' },
      ],
      DEFAULT_SETTINGS,
      TODAY,
      new Set(),
    )
    expect(drafts).toHaveLength(1)
    expect(drafts[0].item.id).toBe('nebenkosten')
    expect(drafts[0].draft.date).toBe('2026-10-01')
    expect(drafts[0].draft.category).toBe('Nebenkosten')
    expect(drafts[0].draft.account).toBe('Ortak Kasa')
  })

  it('atlanan kalem taslak listesine girmez', () => {
    const drafts = draftTransactionsForMonth(
      [NEBENKOSTEN],
      '2026-10',
      [],
      DEFAULT_SETTINGS,
      TODAY,
      new Set(['nebenkosten']),
    )
    expect(drafts).toHaveLength(0)
  })

  it('gunun ayin son gununu asmasi durumunda kirpilir', () => {
    const shortMonthItem = item({
      id: 'short',
      name: 'Ay sonu kalemi',
      category: 'Internet',
      firstPaymentDate: '2026-01-31',
      frequencyMonths: 1,
    })
    // Subat 2026 28 gun cekiyor (2026 artik yil degil).
    const drafts = draftTransactionsForMonth(
      [shortMonthItem],
      '2026-02',
      [],
      DEFAULT_SETTINGS,
      TODAY,
      new Set(),
    )
    expect(drafts[0].draft.date).toBe('2026-02-28')
  })

  it('tutar bossa taslakta 0 gelir, kullanici elle doldurur', () => {
    const noAmount = item({ id: 'no-amount', name: 'Tutar yok', category: 'Internet' })
    const drafts = draftTransactionsForMonth([noAmount], '2026-10', [], DEFAULT_SETTINGS, TODAY, new Set())
    expect(drafts[0].draft.amount).toBe(0)
  })
})
