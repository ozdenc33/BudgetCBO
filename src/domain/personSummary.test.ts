import { describe, expect, it } from 'vitest'
import { computeScopeSummary, computeWeekSummary, weekStartISO } from './personSummary'
import { DEFAULT_SETTINGS } from './constants'
import type { Income, Transaction, Transfer } from './types'

// Ortak harcamalar 50/50 paylasilir; kisisel kategoriler hesap sahibine
// gore tam yazilir (bkz. computeTransaction). Bu testler ozetin ayni
// sayilari yalnizca kisi kirilimiyla topladigini dogrular.
const TX: Transaction[] = [
  // Ortak-Ev 600 -> Can 300 / Tugce 300
  { id: '1', date: '2026-09-02', description: 'Kira', category: 'Kira (Kaltmiete)', amount: 600, currency: 'EUR', account: 'Ortak Kasa' },
  // Kisisel, Can'in hesabi -> tamami Can
  { id: '2', date: '2026-09-03', description: 'D-Ticket', category: 'Ulaşım (D-Ticket)', amount: 58, currency: 'EUR', account: 'Can-DE Girokonto' },
  // Kisisel, Tugce'nin hesabi -> tamami Tugce
  { id: '3', date: '2026-09-04', description: 'Kuaför', category: 'Kuaför/Bakım', amount: 40, currency: 'EUR', account: 'Tuğçe-DE Girokonto' },
  // Onceki ay, bu ayin ozetine girmemeli
  { id: '4', date: '2026-08-20', description: 'Market', category: 'Market (Ev)', amount: 100, currency: 'EUR', account: 'Ortak Kasa' },
]

const INCOMES: Income[] = [
  { id: 'i1', date: '2026-09-01', source: 'Werkstudent', person: 'Can', amount: 1050, currency: 'EUR', account: 'Can-DE Girokonto' },
  { id: 'i2', date: '2026-09-01', source: 'Maaş', person: 'Tuğçe', amount: 1400, currency: 'EUR', account: 'Tuğçe-DE Girokonto' },
  { id: 'i3', date: '2026-08-01', source: 'Maaş', person: 'Tuğçe', amount: 1400, currency: 'EUR', account: 'Tuğçe-DE Girokonto' },
]

const TRANSFERS: Transfer[] = [
  { id: 't1', date: '2026-09-05', type: 'Tasarruf', from: 'Can-DE Girokonto', to: 'Can-Tasarruf', amount: 200, currency: 'EUR', fromAccount: 'Can-DE Girokonto', toAccount: 'Can-Tasarruf' },
]

describe('computeScopeSummary', () => {
  it('Ortak kapsami tum harcamalari ve gelirleri toplar', () => {
    const s = computeScopeSummary('Ortak', '2026-09', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(s.expenseEUR).toBeCloseTo(600 + 58 + 40)
    expect(s.incomeEUR).toBeCloseTo(1050 + 1400)
    expect(s.savingsEUR).toBeCloseTo(200)
    expect(s.netEUR).toBeCloseTo(2450 - 698 - 200)
    expect(s.transactionCount).toBe(3)
  })

  it('Can kapsami yalnizca Can payini toplar (ortak 50/50 + kendi kisisel)', () => {
    const s = computeScopeSummary('Can', '2026-09', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(s.expenseEUR).toBeCloseTo(300 + 58)
    expect(s.incomeEUR).toBeCloseTo(1050)
    expect(s.savingsEUR).toBeCloseTo(200)
    expect(s.netEUR).toBeCloseTo(1050 - 358 - 200)
  })

  it('Tugce kapsami yalnizca Tugce payini toplar', () => {
    const s = computeScopeSummary('Tuğçe', '2026-09', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(s.expenseEUR).toBeCloseTo(300 + 40)
    expect(s.incomeEUR).toBeCloseTo(1400)
    // Tasarruf transferi Can'in hesabindan cikti, Tugce'ye yazilmaz
    expect(s.savingsEUR).toBe(0)
    expect(s.netEUR).toBeCloseTo(1400 - 340)
  })

  it('iki kisinin harcama payi toplami, ortak toplama esittir', () => {
    const ortak = computeScopeSummary('Ortak', '2026-09', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    const can = computeScopeSummary('Can', '2026-09', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    const tugce = computeScopeSummary('Tuğçe', '2026-09', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(can.expenseEUR + tugce.expenseEUR).toBeCloseTo(ortak.expenseEUR)
    expect(can.incomeEUR + tugce.incomeEUR).toBeCloseTo(ortak.incomeEUR)
  })

  it('baska ayin kayitlarini saymaz', () => {
    const s = computeScopeSummary('Ortak', '2026-09', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(s.expenseEUR).not.toBeCloseTo(698 + 100)
  })

  it('kayit yoksa sifir doner', () => {
    const s = computeScopeSummary('Ortak', '2026-12', TX, INCOMES, TRANSFERS, DEFAULT_SETTINGS)
    expect(s.expenseEUR).toBe(0)
    expect(s.incomeEUR).toBe(0)
    expect(s.netEUR).toBe(0)
    expect(s.transactionCount).toBe(0)
  })
})

describe('weekStartISO', () => {
  it('Persembe gunu icin haftanin Pazartesisini verir', () => {
    // 2026-09-03 Persembe -> hafta basi 2026-08-31 Pazartesi
    expect(weekStartISO(new Date('2026-09-03T12:00:00'))).toBe('2026-08-31')
  })

  it('Pazartesi gununde kendisini verir', () => {
    expect(weekStartISO(new Date('2026-08-31T09:00:00'))).toBe('2026-08-31')
  })

  it('Pazar gunu ayni haftada sayilir (Pazartesi baslangicli)', () => {
    // 2026-09-06 Pazar -> hafta basi hala 2026-08-31
    expect(weekStartISO(new Date('2026-09-06T23:00:00'))).toBe('2026-08-31')
  })
})

describe('computeWeekSummary', () => {
  const today = new Date('2026-09-03T12:00:00')

  it('bu haftaki harcamalari toplar (Pazartesi 31 Agustos - bugun)', () => {
    const w = computeWeekSummary('Ortak', TX, DEFAULT_SETTINGS, today)
    expect(w.fromISO).toBe('2026-08-31')
    expect(w.toISO).toBe('2026-09-03')
    // 09-02 Kira 600 + 09-03 D-Ticket 58 (09-04 henuz gelmedi, 08-20 onceki hafta)
    expect(w.expenseEUR).toBeCloseTo(658)
    expect(w.transactionCount).toBe(2)
  })

  it('onceki haftayi ayri toplar', () => {
    const w = computeWeekSummary('Ortak', TX, DEFAULT_SETTINGS, today)
    // 2026-08-24..08-30 arasi: 08-20 bu araliga girmez
    expect(w.previousExpenseEUR).toBe(0)
  })

  it('kisi kapsaminda yalnizca o kisinin payini toplar', () => {
    const w = computeWeekSummary('Can', TX, DEFAULT_SETTINGS, today)
    expect(w.expenseEUR).toBeCloseTo(300 + 58)
  })
})
