import type {
  ComputedRecurringItem,
  Income,
  IncomeDraft,
  RecurringItem,
  RecurringMonthStatus,
  Settings,
  Transaction,
  TransactionDraft,
} from './types'
import { computeTransaction } from './transactions'
import { computeIncome } from './incomes'
import { localISO } from './dates'

// Bu dosya Sabit_Giderler sayfasinin birebir karsiligidir: Aylık
// Eşdeğer (I), Sonraki Ödeme (J, TODAY() bazli), Kalan Gün (K), Seçili
// Ay Durumu (M, seçili ay bazli) ve HAZIR SATIRLAR bloğu (Q:X, ekran
// gorunumu yerine dogrudan taslak islem listesi olarak uretilir).
// Degistirilmeden once docs/proje-talimatlari.md bolum 5, 6.1 ve
// testlerine bakin.
//
// SABIT GELIRLER (kind='income') Excel'de yoktu; ayni motor (taslak/
// atlama/onaylama/hatirlatma) ile calisir, tek farki onaylandiginda
// `transactions` yerine `incomes` koleksiyonuna yazilmasidir (bkz.
// draftIncomesForMonth). Tip tanimlari icin src/domain/types.ts'e
// bakin.

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
 * Ilk odemeden bu yana kacinci odeme donguisundeyiz (1-indeksli).
 * Secili ay vadeye girmiyorsa (offset<0 veya siklikle uyumsuz)
 * tanimsizdir. paymentCount ile kiyaslanip 'tamamlandı' durumunu
 * belirlemek icin kullanilir.
 */
function paymentIndexOf(
  item: RecurringItem,
  selYear: number,
  selMonth: number,
): number | undefined {
  if (!item.firstPaymentDate || !item.frequencyMonths) return undefined
  const first = parseISO(item.firstPaymentDate)
  const offset = monthsBetweenYM(first.y, first.m, selYear, selMonth)
  if (offset < 0 || offset % item.frequencyMonths !== 0) return undefined
  return offset / item.frequencyMonths + 1
}

/**
 * Sabit_Giderler!Seçili Ay Durumu (M) mantigi: kalem bu ay vadeye
 * giriyor mu (ilk odeme + siklik donguse gore), giriyorsa gerceklesen
 * kayitlarda (kind='expense' -> transactions, kind='income' ->
 * incomes) esleşen bir kayit var mi.
 *
 * Gider icin Excel'deki gibi kalem bazinda degil, Bütçe+Kategori
 * ikilisi bazinda eslesir — ayni ikiliyi paylaşan iki kalem birlikte
 * "Girildi" sayilir (bkz. Kilavuz!B24). Gelir icin Kaynak (name) +
 * Kişi ikilisi bazinda eslesir (butce/kategori kavrami yok).
 */
export function monthStatus(
  item: RecurringItem,
  monthKey: string,
  computedTransactions: ReturnType<typeof computeTransaction>[],
  computedIncomes: ReturnType<typeof computeIncome>[] = [],
): { status: RecurringMonthStatus; enteredThisMonthEUR: number; paymentIndex: number | undefined } {
  if (!item.active) {
    return { status: 'pasif', enteredThisMonthEUR: 0, paymentIndex: undefined }
  }
  if (!item.firstPaymentDate || !item.frequencyMonths) {
    return { status: 'tarih-sıklık-eksik', enteredThisMonthEUR: 0, paymentIndex: undefined }
  }
  const [selYear, selMonth] = monthKey.split('-').map(Number)
  const paymentIndex = paymentIndexOf(item, selYear, selMonth)
  if (paymentIndex == null) {
    return { status: 'vadesi-degil', enteredThisMonthEUR: 0, paymentIndex: undefined }
  }
  if (item.paymentCount != null && paymentIndex > item.paymentCount) {
    return { status: 'tamamlandı', enteredThisMonthEUR: 0, paymentIndex }
  }

  const enteredThisMonthEUR =
    item.kind === 'income'
      ? computedIncomes
          .filter(
            (i) => i.monthKey === monthKey && i.source === item.name && i.person === item.person,
          )
          .reduce((sum, i) => sum + (i.amountEUR ?? 0), 0)
      : computedTransactions
          .filter(
            (t) =>
              t.monthKey === monthKey &&
              t.budgetType === item.budgetType &&
              t.category === item.category,
          )
          .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)

  return {
    status: enteredThisMonthEUR > 0 ? 'girildi' : 'eksik',
    enteredThisMonthEUR,
    paymentIndex,
  }
}

function computeOne(
  item: RecurringItem,
  monthKey: string,
  computedTx: ReturnType<typeof computeTransaction>[],
  computedIncomes: ReturnType<typeof computeIncome>[],
  today: Date,
): ComputedRecurringItem {
  const { status, enteredThisMonthEUR, paymentIndex } = monthStatus(
    item,
    monthKey,
    computedTx,
    computedIncomes,
  )
  const next = nextPaymentDate(item, today)

  return {
    ...item,
    monthlyEquivalentEUR: monthlyEquivalentEUR(item),
    nextPaymentDate: next,
    remainingDays: next ? daysBetweenISO(next, todayISO(today)) : undefined,
    monthStatus: status,
    enteredThisMonthEUR,
    paymentIndex,
  }
}

export function computeRecurringItems(
  items: RecurringItem[],
  monthKey: string,
  transactions: Transaction[],
  settings: Settings,
  today: Date,
  incomes: Income[] = [],
): ComputedRecurringItem[] {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  const computedIncomes = incomes.map((i) => computeIncome(i, settings))
  return items.map((item) => computeOne(item, monthKey, computedTx, computedIncomes, today))
}

/**
 * Sabit_Giderler!HAZIR SATIRLAR (Q:X) — bu ay girilmemis (monthStatus
 * === 'eksik') ve kullanici tarafindan atlanmamis GIDER kalemleri icin
 * taslak islem onerir. Gelir kalemleri icin bkz. draftIncomesForMonth.
 * Tarih = secili ayin, ilk odeme gunune en yakin gecerli gunu
 * (Excel'deki MIN(gun, ayin son gunu) kirpmasi).
 */
export function draftTransactionsForMonth(
  items: RecurringItem[],
  monthKey: string,
  transactions: Transaction[],
  settings: Settings,
  today: Date,
  skippedRecurringIds: Set<string>,
  incomes: Income[] = [],
): Array<{ item: RecurringItem; draft: TransactionDraft }> {
  const computed = computeRecurringItems(items, monthKey, transactions, settings, today, incomes)
  const [selYear, selMonth] = monthKey.split('-').map(Number)

  return computed
    .filter(
      (c) => c.kind === 'expense' && c.monthStatus === 'eksik' && !skippedRecurringIds.has(c.id),
    )
    .map((item) => {
      const day = Math.min(parseISO(item.firstPaymentDate).d, daysInMonth(selYear, selMonth))
      const draft: TransactionDraft = {
        date: `${selYear}-${pad2(selMonth)}-${pad2(day)}`,
        description: item.name,
        category: item.category ?? '',
        amount: item.amount ?? 0,
        currency: item.currency ?? 'EUR',
        account: item.account,
      }
      return { item, draft }
    })
}

/**
 * draftTransactionsForMonth'un GELIR karsiligi: bu ay girilmemis
 * kind='income' kalemler icin IncomeDraft onerir.
 */
export function draftIncomesForMonth(
  items: RecurringItem[],
  monthKey: string,
  transactions: Transaction[],
  settings: Settings,
  today: Date,
  skippedRecurringIds: Set<string>,
  incomes: Income[] = [],
): Array<{ item: RecurringItem; draft: IncomeDraft }> {
  const computed = computeRecurringItems(items, monthKey, transactions, settings, today, incomes)
  const [selYear, selMonth] = monthKey.split('-').map(Number)

  return computed
    .filter(
      (c) => c.kind === 'income' && c.monthStatus === 'eksik' && !skippedRecurringIds.has(c.id),
    )
    .map((item) => {
      const day = Math.min(parseISO(item.firstPaymentDate).d, daysInMonth(selYear, selMonth))
      const draft: IncomeDraft = {
        date: `${selYear}-${pad2(selMonth)}-${pad2(day)}`,
        source: item.name,
        person: item.person ?? 'Can',
        amount: item.amount ?? 0,
        currency: item.currency ?? 'EUR',
        account: item.account,
      }
      return { item, draft }
    })
}
