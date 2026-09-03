import type {
  ComputedRecurringItem,
  RecurringItem,
  RecurringMonthStatus,
  Settings,
  Transaction,
  TransactionDraft,
} from './types'
import { computeTransaction } from './transactions'
import { localISO } from './dates'

// Bu dosya Sabit_Giderler sayfasinin birebir karsiligidir: Aylık
// Eşdeğer (I), Sonraki Ödeme (J, TODAY() bazli), Kalan Gün (K), Seçili
// Ay Durumu (M, seçili ay bazli) ve HAZIR SATIRLAR bloğu (Q:X, ekran
// gorunumu yerine dogrudan taslak islem listesi olarak uretilir).
// Degistirilmeden once docs/proje-talimatlari.md bolum 5, 6.1 ve
// testlerine bakin.

function parseISO(dateISO: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateISO.split('-').map(Number)
  return { y, m, d }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(y: number, m: number): number {
  // m: 1-12. Ayin son gunu = bir sonraki ayin 0. gunu.
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** EDATE(dateISO, months) — gun sayisini hedef ayin son gunune kirpar. */
function addMonthsISO(dateISO: string, months: number): string {
  const { y, m, d } = parseISO(dateISO)
  const total = y * 12 + (m - 1) + months
  const targetYear = Math.floor(total / 12)
  const targetMonth = total - targetYear * 12 + 1
  const targetDay = Math.min(d, daysInMonth(targetYear, targetMonth))
  return `${targetYear}-${pad2(targetMonth)}-${pad2(targetDay)}`
}

function monthsBetweenYM(y1: number, m1: number, y2: number, m2: number): number {
  return (y2 - y1) * 12 + (m2 - m1)
}

function toUTCTimestamp(dateISO: string): number {
  const { y, m, d } = parseISO(dateISO)
  return Date.UTC(y, m - 1, d)
}

function daysBetweenISO(a: string, b: string): number {
  return Math.round((toUTCTimestamp(a) - toUTCTimestamp(b)) / 86_400_000)
}

// Yerel tarih (bkz. src/domain/dates.ts) — UTC kullanilirsa gece
// yarisindan sonra "sonraki odeme" bir gun kayar.
const todayISO = localISO

/** Sabit_Giderler!Sonraki Ödeme (J) — TODAY() bazli, hatirlatma icindir. */
export function nextPaymentDate(item: RecurringItem, today: Date): string | undefined {
  if (!item.active || !item.firstPaymentDate) return undefined
  const first = parseISO(item.firstPaymentDate)
  const t = parseISO(todayISO(today))
  const offset = monthsBetweenYM(first.y, first.m, t.y, t.m)
  const k = Math.max(0, Math.ceil(offset / item.frequencyMonths))
  let candidate = addMonthsISO(item.firstPaymentDate, k * item.frequencyMonths)
  if (candidate < todayISO(today)) {
    candidate = addMonthsISO(item.firstPaymentDate, (k + 1) * item.frequencyMonths)
  }
  return candidate
}

/** Sabit_Giderler!Aylık Eşdeğer (I). */
export function monthlyEquivalentEUR(item: RecurringItem): number | undefined {
  if (item.amount == null) return undefined
  return item.amount / item.frequencyMonths
}

/**
 * Sabit_Giderler!Seçili Ay Durumu (M) mantigi: kalem bu ay vadeye
 * giriyor mu (ilk odeme + siklik donguse gore), giriyorsa Islemler'de
 * ayni Bütçe+Kategori ikilisiyle esleşen bir kayit var mi. Excel'deki
 * gibi kalem bazinda degil, Bütçe+Kategori ikilisi bazinda eslesir —
 * ayni ikiliyi paylaşan iki kalem birlikte "Girildi" sayilir (bkz.
 * Kilavuz!B24).
 */
export function monthStatus(
  item: RecurringItem,
  monthKey: string,
  computedTransactions: ReturnType<typeof computeTransaction>[],
): { status: RecurringMonthStatus; enteredThisMonthEUR: number } {
  if (!item.active) return { status: 'pasif', enteredThisMonthEUR: 0 }
  if (!item.firstPaymentDate || !item.frequencyMonths) {
    return { status: 'tarih-sıklık-eksik', enteredThisMonthEUR: 0 }
  }
  const first = parseISO(item.firstPaymentDate)
  const [selYear, selMonth] = monthKey.split('-').map(Number)
  const offset = monthsBetweenYM(first.y, first.m, selYear, selMonth)
  if (offset < 0 || offset % item.frequencyMonths !== 0) {
    return { status: 'vadesi-degil', enteredThisMonthEUR: 0 }
  }
  const enteredThisMonthEUR = computedTransactions
    .filter(
      (t) => t.monthKey === monthKey && t.budgetType === item.budgetType && t.category === item.category,
    )
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)

  return {
    status: enteredThisMonthEUR > 0 ? 'girildi' : 'eksik',
    enteredThisMonthEUR,
  }
}

function computeOne(
  item: RecurringItem,
  monthKey: string,
  computedTx: ReturnType<typeof computeTransaction>[],
  today: Date,
): ComputedRecurringItem {
  const { status, enteredThisMonthEUR } = monthStatus(item, monthKey, computedTx)
  const next = nextPaymentDate(item, today)

  return {
    ...item,
    monthlyEquivalentEUR: monthlyEquivalentEUR(item),
    nextPaymentDate: next,
    remainingDays: next ? daysBetweenISO(next, todayISO(today)) : undefined,
    monthStatus: status,
    enteredThisMonthEUR,
  }
}

export function computeRecurringItems(
  items: RecurringItem[],
  monthKey: string,
  transactions: Transaction[],
  settings: Settings,
  today: Date,
): ComputedRecurringItem[] {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  return items.map((item) => computeOne(item, monthKey, computedTx, today))
}

/**
 * Sabit_Giderler!HAZIR SATIRLAR (Q:X) — bu ay girilmemis (monthStatus
 * === 'eksik') ve kullanici tarafindan atlanmamis kalemler icin taslak
 * islem onerir. Tarih = secili ayin, ilk odeme gunune en yakin gecerli
 * gunu (Excel'deki MIN(gun, ayin son gunu) kirpmasi).
 */
export function draftTransactionsForMonth(
  items: RecurringItem[],
  monthKey: string,
  transactions: Transaction[],
  settings: Settings,
  today: Date,
  skippedRecurringIds: Set<string>,
): Array<{ item: RecurringItem; draft: TransactionDraft }> {
  const computed = computeRecurringItems(items, monthKey, transactions, settings, today)
  const [selYear, selMonth] = monthKey.split('-').map(Number)

  return computed
    .filter((c) => c.monthStatus === 'eksik' && !skippedRecurringIds.has(c.id))
    .map((item) => {
      const day = Math.min(parseISO(item.firstPaymentDate).d, daysInMonth(selYear, selMonth))
      const draft: TransactionDraft = {
        date: `${selYear}-${pad2(selMonth)}-${pad2(day)}`,
        description: item.name,
        category: item.category,
        amount: item.amount ?? 0,
        currency: 'EUR',
        account: item.account,
      }
      return { item, draft }
    })
}
