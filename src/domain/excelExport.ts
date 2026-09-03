import ExcelJS from 'exceljs'
import type { Goal, Income, RecurringItem, Settings, Transaction, Transfer } from './types'
import { computeTransaction } from './transactions'
import { computeIncome } from './incomes'
import { computeTransfer } from './transfers'
import { computeGoal } from './goals'
import { computeRecurringItems } from './recurring'

// Ortak_Butce_v9.xlsx'in gercek kolon sirasiyla birebir ayni bicimde
// yazar (baslik satiri 3, veri 4. satirdan baslar) — src/domain/
// excelImport.ts bu dosyayi degistirmeden geri okuyabilir, yani bu
// yedek gercekten geri yuklenebilir (round-trip). A-H arasi (Islemler),
// A-I arasi (Gelirler) vb. elle girilen kolonlardir; sonrasindaki
// kolonlar sadece insan gozuyle kontrol icin eklenen hesaplanmis
// degerlerdir, ice aktarirken yok sayilir.

function headerRow(sheet: ExcelJS.Worksheet, rowNumber: number, headers: string[]) {
  const row = sheet.getRow(rowNumber)
  headers.forEach((h, i) => {
    row.getCell(i + 1).value = h
  })
  row.font = { bold: true }
}

function dataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: (string | number | undefined)[],
) {
  const row = sheet.getRow(rowNumber)
  values.forEach((v, i) => {
    if (v !== undefined && v !== '') row.getCell(i + 1).value = v
  })
}

export async function exportWorkbook(data: {
  transactions: Transaction[]
  incomes: Income[]
  transfers: Transfer[]
  recurring: RecurringItem[]
  goals: Goal[]
  settings: Settings
  today: Date
}): Promise<Blob> {
  const { transactions, incomes, transfers, recurring, goals, settings, today } = data
  const workbook = new ExcelJS.Workbook()
  workbook.created = today

  const islemler = workbook.addWorksheet('Islemler')
  headerRow(islemler, 3, [
    'Tarih',
    'Açıklama',
    'Kategori',
    'Tutar',
    'Hesap',
    'Para Birimi',
    'Can %',
    'Tuğçe %',
    'Kontrol',
    'Tutar (EUR)',
    'Bütçe',
    'Can Payı (EUR)',
    'Tuğçe Payı (EUR)',
    'Ay',
    'Etiket',
    'Not',
  ])
  transactions
    .map((t) => computeTransaction(t, settings))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((t, i) => {
      dataRow(islemler, 4 + i, [
        t.date,
        t.description,
        t.category,
        t.amount,
        t.account,
        t.currency,
        t.canPct,
        t.tugcePct,
        t.validation,
        t.amountEUR,
        t.budgetType,
        t.canShare,
        t.tugceShare,
        t.monthKey,
        t.tag,
        t.note,
      ])
    })

  const gelirler = workbook.addWorksheet('Gelirler')
  headerRow(gelirler, 3, [
    'Tarih',
    'Ay',
    'Kaynak',
    'Kişi',
    'Tutar',
    'Para Birimi',
    'Kur',
    'Tutar (EUR)',
    'Hesap',
    'Not',
    'Kontrol',
  ])
  incomes
    .map((i) => computeIncome(i, settings))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((inc, i) => {
      dataRow(gelirler, 4 + i, [
        inc.date,
        inc.monthKey,
        inc.source,
        inc.person,
        inc.amount,
        inc.currency,
        inc.rate,
        inc.amountEUR,
        inc.account,
        inc.note,
        inc.validation,
      ])
    })

  const transferler = workbook.addWorksheet('Transferler')
  headerRow(transferler, 3, [
    'Tarih',
    'Ay',
    'Tip',
    'Gönderen',
    'Alıcı',
    'Tutar',
    'Para Birimi',
    'Kur',
    'Tutar (EUR)',
    'Kaynak Hesap',
    'Hedef Hesap',
    'Not',
    'Kontrol',
  ])
  transfers
    .map((t) => computeTransfer(t, settings))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((t, i) => {
      dataRow(transferler, 4 + i, [
        t.date,
        t.monthKey,
        t.type,
        t.from,
        t.to,
        t.amount,
        t.currency,
        t.rate,
        t.amountEUR,
        t.fromAccount,
        t.toAccount,
        t.note,
        t.validation,
      ])
    })

  const sabitGiderler = workbook.addWorksheet('Sabit_Giderler')
  headerRow(sabitGiderler, 3, [
    'Kalem',
    'Bütçe',
    'Kategori',
    'Tutar (EUR)',
    'Sıklık (ay)',
    'Hesap (plan)',
    'İlk Ödeme Tarihi',
    'Aktif',
    'Aylık Eşdeğer',
    'Sonraki Ödeme',
    'Kalan Gün',
    'Bu Ay Girilen (EUR)',
    'Seçili Ay Durumu',
    'Not',
  ])
  const monthLabel: Record<string, string> = {
    pasif: '-',
    'tarih-sıklık-eksik': 'tarih/sıklık girin',
    'vadesi-degil': '-',
    girildi: 'Girildi',
    eksik: 'EKSIK',
  }
  const selectedMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  computeRecurringItems(recurring, selectedMonthKey, transactions, settings, today).forEach(
    (r, i) => {
      dataRow(sabitGiderler, 4 + i, [
        r.name,
        r.budgetType,
        r.category,
        r.amount,
        r.frequencyMonths,
        r.account,
        r.firstPaymentDate,
        r.active ? 'Evet' : 'Hayır',
        r.monthlyEquivalentEUR,
        r.nextPaymentDate,
        r.remainingDays,
        r.enteredThisMonthEUR,
        monthLabel[r.monthStatus],
        r.note,
      ])
    },
  )

  const hedefler = workbook.addWorksheet('Hedefler')
  headerRow(hedefler, 3, [
    'Hedef',
    'Sahip',
    'Hedef Tutar (EUR)',
    'Hedef Tarih',
    'Biriken (EUR)',
    'Kalan (EUR)',
    'İlerleme %',
    'Kalan Ay',
    'Aylık Gereken',
    'Can Katkısı',
    'Tuğçe Katkısı',
    'Not',
  ])
  goals
    .map((g) => computeGoal(g, transfers, settings, today))
    .forEach((g, i) => {
      dataRow(hedefler, 4 + i, [
        g.name,
        g.owner,
        g.targetAmount,
        g.targetDate,
        g.accumulatedEUR,
        g.remainingEUR,
        g.progressPct,
        g.remainingMonths,
        g.monthlyRequiredEUR,
        g.canContributionEUR,
        g.tugceContributionEUR,
        g.note,
      ])
    })

  for (const sheet of workbook.worksheets) {
    sheet.columns.forEach((col) => {
      col.width = 16
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
