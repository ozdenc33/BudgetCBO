import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { parseWorkbookBuffer } from './excelImport'

// Ortak_Butce_v9.xlsx'in gercek kolon duzenini taklit eden kucuk bir
// workbook uretir (baslik satiri 3, veri 4. satirdan baslar).

async function buildWorkbook(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()

  const islemler = wb.addWorksheet('Islemler')
  islemler.getRow(3).values = [
    'Tarih', 'Açıklama', 'Kategori', 'Tutar', 'Hesap', 'Para Birimi', 'Can %', 'Tuğçe %',
  ]
  islemler.getRow(4).values = [
    new Date(2026, 9, 1), 'Ekim kira', 'Kira (Kaltmiete)', 950, 'Ortak Kasa', 'EUR',
  ]
  islemler.getRow(5).values = [
    new Date(2026, 9, 15), 'Fotoğraf filmi', 'Hobi/Fotoğraf', 38.9, 'Can-DE Girokonto', 'EUR', 1,
  ]
  // O=15 Etiket, P=16 Not
  islemler.getCell(5, 15).value = 'Stuttgart'
  islemler.getCell(5, 16).value = 'test notu'
  // Eksik alanli satir (kategori yok) — atlanmali.
  islemler.getRow(6).values = [new Date(2026, 9, 20), 'Eksik satir', '', 10, 'Ortak Kasa', 'EUR']

  const gelirler = wb.addWorksheet('Gelirler')
  gelirler.getRow(3).values = [
    'Tarih', 'Ay', 'Kaynak', 'Kişi', 'Tutar', 'Para Birimi', 'Kur', 'Tutar (EUR)', 'Hesap', 'Not',
  ]
  gelirler.getRow(4).values = [
    new Date(2026, 9, 5), '2026-10', 'Sperrkonto', 'Can', 992, 'EUR', 1, 992, 'Can-DE Girokonto', 'not',
  ]

  const transferler = wb.addWorksheet('Transferler')
  transferler.getRow(3).values = [
    'Tarih', 'Ay', 'Tip', 'Gönderen', 'Alıcı', 'Tutar', 'Para Birimi', 'Kur', 'Tutar (EUR)',
    'Kaynak Hesap', 'Hedef Hesap', 'Not',
  ]
  transferler.getRow(4).values = [
    new Date(2026, 8, 28), '2026-09', 'Ortak Kasa Katkısı', 'Can', 'Ortak Kasa', 500, 'EUR', 1, 500,
    'Can-DE Girokonto', 'Ortak Kasa',
  ]

  const sabit = wb.addWorksheet('Sabit_Giderler')
  sabit.getRow(3).values = [
    'Kalem', 'Bütçe', 'Kategori', 'Tutar (EUR)', 'Sıklık (ay)', 'Hesap (plan)', 'İlk Ödeme Tarihi', 'Aktif',
  ]
  sabit.getRow(4).values = [
    'Kira (Kaltmiete)', 'Ortak-Ev', 'Kira (Kaltmiete)', 950, 1, 'Ortak Kasa', new Date(2026, 9, 1), 'Evet',
  ]

  const hedefler = wb.addWorksheet('Hedefler')
  hedefler.getRow(3).values = [
    'Hedef', 'Sahip', 'Hedef Tutar (EUR)', 'Hedef Tarih',
  ]
  hedefler.getRow(4).values = [
    'Acil Durum Fonu', 'Ortak', 2000, new Date(2027, 5, 30),
  ]
  // Satir 5-8 bos (gercek dosyada oldugu gibi), sonra bos bir satirla
  // ayrilmis TOPLAM ve not satirlari gelir — bunlar hedef sayilmamali.
  hedefler.getRow(9).values = ['TOPLAM', undefined, 2000]
  hedefler.getRow(10).values = ['Sahip = Ortak ise her iki kişi de...']

  const buffer = await wb.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}

describe('parseWorkbookBuffer', () => {
  it('Islemler sayfasini dogru kolonlardan okur, eksik satiri atlar', async () => {
    const result = await parseWorkbookBuffer(await buildWorkbook())
    expect(result.transactions).toHaveLength(2)

    const kira = result.transactions.find((t) => t.description === 'Ekim kira')!
    expect(kira.date).toBe('2026-10-01')
    expect(kira.category).toBe('Kira (Kaltmiete)')
    expect(kira.amount).toBe(950)
    expect(kira.account).toBe('Ortak Kasa')
    expect(kira.currency).toBe('EUR')

    const foto = result.transactions.find((t) => t.description === 'Fotoğraf filmi')!
    expect(foto.canPct).toBe(1)
    expect(foto.tag).toBe('Stuttgart')
    expect(foto.note).toBe('test notu')

    expect(result.warnings.some((w) => w.includes('satır 6'))).toBe(true)
  })

  it('Gelirler sayfasini dogru kolonlardan okur', async () => {
    const result = await parseWorkbookBuffer(await buildWorkbook())
    expect(result.incomes).toHaveLength(1)
    const g = result.incomes[0]
    expect(g.date).toBe('2026-10-05')
    expect(g.source).toBe('Sperrkonto')
    expect(g.person).toBe('Can')
    expect(g.amount).toBe(992)
    expect(g.account).toBe('Can-DE Girokonto')
  })

  it('Transferler sayfasini dogru kolonlardan okur', async () => {
    const result = await parseWorkbookBuffer(await buildWorkbook())
    expect(result.transfers).toHaveLength(1)
    const t = result.transfers[0]
    expect(t.type).toBe('Ortak Kasa Katkısı')
    expect(t.from).toBe('Can')
    expect(t.to).toBe('Ortak Kasa')
    expect(t.fromAccount).toBe('Can-DE Girokonto')
    expect(t.toAccount).toBe('Ortak Kasa')
  })

  it('Sabit_Giderler sayfasini dogru kolonlardan okur', async () => {
    const result = await parseWorkbookBuffer(await buildWorkbook())
    expect(result.recurring).toHaveLength(1)
    const r = result.recurring[0]
    expect(r.name).toBe('Kira (Kaltmiete)')
    expect(r.budgetType).toBe('Ortak-Ev')
    expect(r.frequencyMonths).toBe(1)
    expect(r.firstPaymentDate).toBe('2026-10-01')
    expect(r.active).toBe(true)
  })

  it('Hedefler sayfasini dogru kolonlardan okur, bos satirdan sonraki TOPLAM/not satirlarini almaz', async () => {
    const result = await parseWorkbookBuffer(await buildWorkbook())
    expect(result.goals).toHaveLength(1)
    const g = result.goals[0]
    expect(g.name).toBe('Acil Durum Fonu')
    expect(g.owner).toBe('Ortak')
    expect(g.targetAmount).toBe(2000)
    expect(g.targetDate).toBe('2027-06-30')
    expect(result.goals.some((x) => x.name === 'TOPLAM')).toBe(false)
  })
})
