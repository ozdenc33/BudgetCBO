import ExcelJS from 'exceljs'
import type {
  Currency,
  GoalDraft,
  GoalOwner,
  IncomeDraft,
  Person,
  RecurringItemDraft,
  TransactionDraft,
  TransferDraft,
  TransferType,
} from './types'

// Ortak_Butce_v9.xlsx'in gercek kolon sirasini okur (veri 4. satirdan
// baslar). Yalnizca elle doldurulan sari kolonlar okunur; gri (formul)
// kolonlar yok sayilir, cunku uygulama bunlari kendisi hesaplar.

export type ImportResult = {
  transactions: TransactionDraft[]
  incomes: IncomeDraft[]
  transfers: TransferDraft[]
  recurring: RecurringItemDraft[]
  goals: GoalDraft[]
  warnings: string[]
}

function cellDateISO(cell: ExcelJS.Cell | undefined): string | undefined {
  if (!cell) return undefined
  const v = cell.value
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  if (typeof v === 'object' && v !== null && 'result' in v) {
    const result = (v as { result: unknown }).result
    if (result instanceof Date) {
      return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`
    }
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  return undefined
}

function cellString(cell: ExcelJS.Cell | undefined): string | undefined {
  if (!cell) return undefined
  const v = cell.value
  if (v == null) return undefined
  if (typeof v === 'string') return v.trim() || undefined
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object' && 'richText' in v) {
    return (
      (v as { richText: { text: string }[] }).richText
        .map((r) => r.text)
        .join('')
        .trim() || undefined
    )
  }
  if (typeof v === 'object' && 'result' in v) {
    const result = (v as { result: unknown }).result
    return result == null ? undefined : String(result).trim() || undefined
  }
  return undefined
}

function cellNumber(cell: ExcelJS.Cell | undefined): number | undefined {
  if (!cell) return undefined
  const v = cell.value
  if (typeof v === 'number') return v
  if (typeof v === 'object' && v !== null && 'result' in v) {
    const result = (v as { result: unknown }).result
    if (typeof result === 'number') return result
  }
  return undefined
}

function findSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  return workbook.worksheets.find((s) => s.name.trim().toLowerCase() === name.toLowerCase())
}

const VALID_CURRENCIES: Currency[] = ['EUR', 'TRY']

function toCurrency(value: string | undefined): Currency | '' {
  if (!value) return ''
  return VALID_CURRENCIES.includes(value as Currency) ? (value as Currency) : ''
}

const VALID_TRANSFER_TYPES: TransferType[] = ['Ortak Kasa Katkısı', 'Kişiden Kişiye', 'Tasarruf']
const VALID_GOAL_OWNERS: GoalOwner[] = ['Ortak', 'Can', 'Tuğçe']

/**
 * Veri satirlarini 4. satirdan itibaren gezer, birincil kolon (ornegin
 * Tarih ya da Kalem) bos oldugu anda TAMAMEN durur. Sayfalarda veri
 * bloğundan sonra bos bir satirla ayrilmis TOPLAM/not satirlari
 * bulunur (ornegin Hedefler!A12='TOPLAM', A14='Sahip = Ortak ise...');
 * eachRow({includeEmpty:false}) bu bos satiri atlayip o satirlari da
 * veri sanardi, bu yuzden ilk bosluk kesin bir dur sinyalidir.
 */
function forEachDataRow(
  sheet: ExcelJS.Worksheet,
  primaryCol: number,
  onRow: (row: ExcelJS.Row, rowNumber: number) => void,
) {
  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const primary = row.getCell(primaryCol).value
    if (primary == null || primary === '') break
    onRow(row, rowNumber)
  }
}

function parseIslemler(workbook: ExcelJS.Workbook, warnings: string[]): TransactionDraft[] {
  const sheet = findSheet(workbook, 'Islemler')
  if (!sheet) return []
  const drafts: TransactionDraft[] = []

  forEachDataRow(sheet, 1, (row, rowNumber) => {
    const date = cellDateISO(row.getCell(1))
    if (!date) return
    const category = cellString(row.getCell(3))
    const amount = cellNumber(row.getCell(4))
    const account = cellString(row.getCell(5))
    if (!category || amount == null || !account) {
      warnings.push(`Islemler satır ${rowNumber}: eksik alan, atlandı.`)
      return
    }
    const draft: TransactionDraft = {
      date,
      description: cellString(row.getCell(2)) ?? '',
      category,
      amount,
      currency: toCurrency(cellString(row.getCell(6))),
      account,
    }
    const canPct = cellNumber(row.getCell(7))
    const tugcePct = cellNumber(row.getCell(8))
    if (canPct != null) draft.canPct = canPct
    if (tugcePct != null) draft.tugcePct = tugcePct
    const tag = cellString(row.getCell(15))
    const note = cellString(row.getCell(16))
    if (tag) draft.tag = tag
    if (note) draft.note = note
    drafts.push(draft)
  })

  return drafts
}

function parseGelirler(workbook: ExcelJS.Workbook, warnings: string[]): IncomeDraft[] {
  const sheet = findSheet(workbook, 'Gelirler')
  if (!sheet) return []
  const drafts: IncomeDraft[] = []

  forEachDataRow(sheet, 1, (row, rowNumber) => {
    const date = cellDateISO(row.getCell(1))
    if (!date) return
    const source = cellString(row.getCell(3))
    const person = cellString(row.getCell(4))
    const amount = cellNumber(row.getCell(5))
    const account = cellString(row.getCell(9))
    if (!source || (person !== 'Can' && person !== 'Tuğçe') || amount == null || !account) {
      warnings.push(`Gelirler satır ${rowNumber}: eksik/geçersiz alan, atlandı.`)
      return
    }
    const draft: IncomeDraft = {
      date,
      source,
      person: person as Person,
      amount,
      currency: toCurrency(cellString(row.getCell(6))),
      account,
    }
    const note = cellString(row.getCell(10))
    if (note) draft.note = note
    drafts.push(draft)
  })

  return drafts
}

function parseTransferler(workbook: ExcelJS.Workbook, warnings: string[]): TransferDraft[] {
  const sheet = findSheet(workbook, 'Transferler')
  if (!sheet) return []
  const drafts: TransferDraft[] = []

  forEachDataRow(sheet, 1, (row, rowNumber) => {
    const date = cellDateISO(row.getCell(1))
    if (!date) return
    const type = cellString(row.getCell(3))
    const from = cellString(row.getCell(4))
    const to = cellString(row.getCell(5))
    const amount = cellNumber(row.getCell(6))
    if (
      !type ||
      !VALID_TRANSFER_TYPES.includes(type as TransferType) ||
      !from ||
      !to ||
      amount == null
    ) {
      warnings.push(`Transferler satır ${rowNumber}: eksik/geçersiz alan, atlandı.`)
      return
    }
    const draft: TransferDraft = {
      date,
      type: type as TransferType,
      from,
      to,
      amount,
      currency: toCurrency(cellString(row.getCell(7))),
      fromAccount: cellString(row.getCell(10)) ?? '',
      toAccount: cellString(row.getCell(11)) ?? '',
    }
    const note = cellString(row.getCell(12))
    if (note) draft.note = note
    drafts.push(draft)
  })

  return drafts
}

function parseSabitGiderler(workbook: ExcelJS.Workbook, warnings: string[]): RecurringItemDraft[] {
  const sheet = findSheet(workbook, 'Sabit_Giderler')
  if (!sheet) return []
  const drafts: RecurringItemDraft[] = []

  forEachDataRow(sheet, 1, (row, rowNumber) => {
    const name = cellString(row.getCell(1)) ?? ''
    const budgetType = cellString(row.getCell(2))
    const category = cellString(row.getCell(3))
    const frequency = cellNumber(row.getCell(5))
    const account = cellString(row.getCell(6))
    const firstPaymentDate = cellDateISO(row.getCell(7))
    if (!budgetType || !category || !account || !firstPaymentDate || !frequency) {
      warnings.push(`Sabit_Giderler satır ${rowNumber} (${name}): eksik alan, atlandı.`)
      return
    }
    const draft: RecurringItemDraft = {
      name,
      // Excel'in Sabit_Giderler sayfasi hep gider icindi; gelir kavrami
      // yoktu.
      kind: 'expense',
      budgetType: budgetType as RecurringItemDraft['budgetType'],
      category,
      frequencyMonths: ([1, 3, 6, 12].includes(frequency)
        ? frequency
        : 1) as RecurringItemDraft['frequencyMonths'],
      account,
      firstPaymentDate,
      active: cellString(row.getCell(8)) === 'Evet',
    }
    const amount = cellNumber(row.getCell(4))
    if (amount != null) draft.amount = amount
    const note = cellString(row.getCell(14))
    if (note) draft.note = note
    drafts.push(draft)
  })

  return drafts
}

function parseHedefler(workbook: ExcelJS.Workbook, warnings: string[]): GoalDraft[] {
  const sheet = findSheet(workbook, 'Hedefler')
  if (!sheet) return []
  const drafts: GoalDraft[] = []

  forEachDataRow(sheet, 1, (row, rowNumber) => {
    const name = cellString(row.getCell(1)) ?? ''
    const owner = cellString(row.getCell(2))
    if (!owner || !VALID_GOAL_OWNERS.includes(owner as GoalOwner)) {
      warnings.push(`Hedefler satır ${rowNumber} (${name}): geçersiz sahip, "Ortak" varsayıldı.`)
    }
    const draft: GoalDraft = {
      name,
      owner: VALID_GOAL_OWNERS.includes(owner as GoalOwner) ? (owner as GoalOwner) : 'Ortak',
    }
    const targetAmount = cellNumber(row.getCell(3))
    const targetDate = cellDateISO(row.getCell(4))
    const note = cellString(row.getCell(12))
    if (targetAmount != null) draft.targetAmount = targetAmount
    if (targetDate) draft.targetDate = targetDate
    if (note) draft.note = note
    drafts.push(draft)
  })

  return drafts
}

export async function parseWorkbookBuffer(buffer: ArrayBuffer): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const warnings: string[] = []
  const transactions = parseIslemler(workbook, warnings)
  const incomes = parseGelirler(workbook, warnings)
  const transfers = parseTransferler(workbook, warnings)
  const recurring = parseSabitGiderler(workbook, warnings)
  const goals = parseHedefler(workbook, warnings)

  if (transactions.length === 0 && incomes.length === 0 && transfers.length === 0) {
    warnings.push(
      'Islemler, Gelirler ve Transferler sayfalarında okunabilir satır bulunamadı. Sayfa adlarının ve kolon sırasının Ortak_Butce_v9.xlsx ile aynı olduğundan emin olun.',
    )
  }

  return { transactions, incomes, transfers, recurring, goals, warnings }
}

export async function parseWorkbookFile(file: File): Promise<ImportResult> {
  return parseWorkbookBuffer(await file.arrayBuffer())
}
