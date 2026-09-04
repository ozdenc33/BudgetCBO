import type { ComputedRecurringItem, Income, RecurringItem, Settings, Transaction } from './types'
import { computeRecurringItems } from './recurring'

// Proje talimatlari bolum 6.2: yaklasan sabit odemeler ve ay sonunda
// hala onaylanmamis taslaklar icin uyari. Push bildirimi yerine
// uygulama ici uyari kullanilir — push icin bir Cloud Function (arka
// planda, uygulama kapaliyken tetiklenen bir sunucu bileseni) gerekir,
// bu da projenin "istemci tarafinda, uygulama acildiginda" ilkesiyle
// celisir ve ücretsiz katman kapsaminin ayrica dogrulanmasini gerektirir
// (bkz. README "Push bildirimi" notu). Bu yuzden simdilik yalnizca
// uygulama ici uyari uygulanir.

const UPCOMING_DAYS_THRESHOLD = 7
const MONTH_END_WARNING_DAYS = 5

function daysLeftInMonth(today: Date): number {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return daysInMonth - today.getDate()
}

function currentMonthKey(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

export type Reminders = {
  upcoming: ComputedRecurringItem[]
  unconfirmedNearMonthEnd: ComputedRecurringItem[]
  /**
   * Odeme gunu gecmis ama bu ay hala girilmemis kalemler. Onceden
   * yalnizca ay sonuna 5 gun kala uyariliyordu; oysa ayin 1'inde odenmesi
   * gereken kira ayin 10'unda hala girilmemisse bunu ay sonunu beklemeden
   * bilmek gerekir.
   */
  overdue: ComputedRecurringItem[]
}

/** Kalemin bu ayki odeme gunu (ayin kaci). */
function dueDayOfMonth(item: ComputedRecurringItem): number | undefined {
  if (!item.firstPaymentDate) return undefined
  const day = Number(item.firstPaymentDate.slice(8, 10))
  return Number.isFinite(day) ? day : undefined
}

export function computeReminders(
  recurring: RecurringItem[],
  transactions: Transaction[],
  settings: Settings,
  today: Date,
  incomes: Income[] = [],
): Reminders {
  const monthKey = currentMonthKey(today)
  const computed = computeRecurringItems(
    recurring,
    monthKey,
    transactions,
    settings,
    today,
    incomes,
  )

  const upcoming = computed
    .filter(
      (r) =>
        r.active &&
        r.remainingDays != null &&
        r.remainingDays >= 0 &&
        r.remainingDays <= UPCOMING_DAYS_THRESHOLD,
    )
    .sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0))

  const unconfirmedNearMonthEnd =
    daysLeftInMonth(today) <= MONTH_END_WARNING_DAYS
      ? computed.filter((r) => r.monthStatus === 'eksik')
      : []

  const overdue = computed
    .filter((r) => {
      if (r.monthStatus !== 'eksik') return false
      const due = dueDayOfMonth(r)
      return due != null && due <= today.getDate()
    })
    .sort((a, b) => (dueDayOfMonth(a) ?? 0) - (dueDayOfMonth(b) ?? 0))

  return { upcoming, unconfirmedNearMonthEnd, overdue }
}
