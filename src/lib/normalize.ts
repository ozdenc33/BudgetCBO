import { DEFAULT_RATE } from '../domain/constants'
import type {
  Currency,
  Goal,
  GoalOwner,
  Income,
  Person,
  PersonalBudgetPlan,
  RecurringItem,
  RecurringKind,
  RecurringSkip,
  Settings,
  Transaction,
  Transfer,
  TransferType,
  BudgetType,
  FrequencyMonths,
} from '../domain/types'

/**
 * Firestore'dan gelen ham dokumanlari uygulama tiplerine cevirir.
 *
 * NEDEN: Onceden her abonelik `{ id, ...d.data() } as Transaction`
 * yapiyordu — bu bir CAST'ti, dogrulama degil. Yarim kalmis bir ice
 * aktarma, Firebase Console'dan elle yapilan bir duzenleme ya da eski
 * bir alan adi, hesaplamalara sessizce `NaN` veya `undefined` sokuyor
 * ve ekranda "NaN €" olarak beliriyordu.
 *
 * Kural: BOZUK VERIYI UYDURMA. Sayiya cevrilemeyen bir tutar 0 yapilmaz,
 * alan hic yazilmaz; boylece mevcut dogrulama ("Eksik alan: ...") o
 * satiri kullaniciya isaretler.
 */

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optStr(value: unknown): string | undefined {
  const s = str(value)
  return s === '' ? undefined : s
}

/** Sayi ya da sayiya cevrilebilen metin; digerlerinde undefined. */
function optNum(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function optOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined
}

const CURRENCIES = ['EUR', 'TRY'] as const
const PERSONS: readonly Person[] = ['Can', 'Tuğçe']
const GOAL_OWNERS: readonly GoalOwner[] = ['Can', 'Tuğçe', 'Ortak']
const TRANSFER_TYPES: readonly TransferType[] = ['Ortak Kasa Katkısı', 'Kişiden Kişiye', 'Tasarruf']
const BUDGET_TYPES: readonly BudgetType[] = [
  'Ortak-Ev',
  'Ortak-Dışarı',
  'Mike',
  'Kişisel-Can',
  'Kişisel-Tuğçe',
  'Taşınma',
]
const FREQUENCIES: readonly FrequencyMonths[] = [1, 3, 6, 12]
const RECURRING_KINDS: readonly RecurringKind[] = ['expense', 'income']

function currency(value: unknown): Currency | '' {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : ''
}

/** 0-1 arasi paylasim orani. Disindaki degerler yok sayilir. */
function optRatio(value: unknown): number | undefined {
  const n = optNum(value)
  if (n == null || n < 0 || n > 1) return undefined
  return n
}

export function toTransaction(id: string, data: Record<string, unknown>): Transaction {
  const tx: Transaction = {
    id,
    date: str(data.date),
    description: str(data.description),
    category: str(data.category),
    currency: currency(data.currency),
    account: str(data.account),
  }
  const amount = optNum(data.amount)
  if (amount != null) tx.amount = amount
  const secondAccount = optStr(data.secondAccount)
  if (secondAccount) tx.secondAccount = secondAccount
  const canPct = optRatio(data.canPct)
  if (canPct != null) tx.canPct = canPct
  const tugcePct = optRatio(data.tugcePct)
  if (tugcePct != null) tx.tugcePct = tugcePct
  const tag = optStr(data.tag)
  if (tag) tx.tag = tag
  const note = optStr(data.note)
  if (note) tx.note = note
  return tx
}

export function toIncome(id: string, data: Record<string, unknown>): Income {
  const income: Income = {
    id,
    date: str(data.date),
    source: str(data.source),
    person: oneOf(data.person, PERSONS, 'Can'),
    currency: currency(data.currency),
    account: str(data.account),
  }
  const amount = optNum(data.amount)
  if (amount != null) income.amount = amount
  const note = optStr(data.note)
  if (note) income.note = note
  return income
}

export function toTransfer(id: string, data: Record<string, unknown>): Transfer {
  const transfer: Transfer = {
    id,
    date: str(data.date),
    // Tip taninmiyorsa bos birakilir; dogrulama satiri "Eksik alan" der.
    type: optOneOf(data.type, TRANSFER_TYPES) ?? ('' as TransferType),
    from: str(data.from),
    to: str(data.to),
    currency: currency(data.currency),
    fromAccount: str(data.fromAccount),
    toAccount: str(data.toAccount),
  }
  const amount = optNum(data.amount)
  if (amount != null) transfer.amount = amount
  const goalId = optStr(data.goalId)
  if (goalId) transfer.goalId = goalId
  const note = optStr(data.note)
  if (note) transfer.note = note
  return transfer
}

export function toGoal(id: string, data: Record<string, unknown>): Goal {
  const goal: Goal = {
    id,
    name: str(data.name),
    owner: oneOf(data.owner, GOAL_OWNERS, 'Ortak'),
  }
  const targetAmount = optNum(data.targetAmount)
  if (targetAmount != null) goal.targetAmount = targetAmount
  const targetDate = optStr(data.targetDate)
  if (targetDate) goal.targetDate = targetDate
  const note = optStr(data.note)
  if (note) goal.note = note
  return goal
}

export function toRecurringItem(id: string, data: Record<string, unknown>): RecurringItem {
  // 'kind' bu ozellikten once yoktu; eski kayitlarin hepsi gercek
  // sabit giderdi, o yuzden yoksa 'expense' varsayilir (davranis
  // degismez).
  const kind = oneOf(data.kind, RECURRING_KINDS, 'expense')

  const item: RecurringItem = {
    id,
    name: str(data.name),
    kind,
    frequencyMonths: FREQUENCIES.includes(data.frequencyMonths as FrequencyMonths)
      ? (data.frequencyMonths as FrequencyMonths)
      : 1,
    account: str(data.account),
    firstPaymentDate: str(data.firstPaymentDate),
    // Alan hic yoksa kalem aktif sayilir (eski kayitlarla uyum).
    active: data.active !== false,
  }
  if (kind === 'expense') {
    item.budgetType = oneOf(data.budgetType, BUDGET_TYPES, 'Ortak-Ev')
    item.category = str(data.category)
  } else {
    const person = optOneOf(data.person, PERSONS)
    if (person) item.person = person
  }
  const amount = optNum(data.amount)
  if (amount != null) item.amount = amount
  const itemCurrency = currency(data.currency)
  if (itemCurrency) item.currency = itemCurrency
  const paymentCount = optNum(data.paymentCount)
  if (paymentCount != null && paymentCount > 0) item.paymentCount = Math.round(paymentCount)
  const note = optStr(data.note)
  if (note) item.note = note
  return item
}

export function toRecurringSkip(id: string, data: Record<string, unknown>): RecurringSkip {
  return {
    id,
    recurringId: str(data.recurringId),
    monthKey: str(data.monthKey),
  }
}

function numRecord(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = optNum(v)
    if (n != null) out[k] = n
  }
  return out
}

function toPersonalBudgetPlan(value: unknown): PersonalBudgetPlan {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  return {
    incomePlan: numRecord(v.incomePlan),
    sharedContributionPlanEUR: optNum(v.sharedContributionPlanEUR) ?? 0,
    categoryPlan: numRecord(v.categoryPlan),
    savingsPlanEUR: optNum(v.savingsPlanEUR) ?? 0,
  }
}

/**
 * settings/app onceden `snap.data() as Settings` ile dogrudan cast
 * ediliyordu — tek koleksiyon bu dosyanin dogrulamasindan gecmiyordu.
 * firestore.rules yalnizca ust duzey alan TIPLERINI kontrol eder
 * (orn. personalPlans, incomeSources[].active hic dogrulanmaz); eksik
 * bir alt alan (orn. Excel'den once var olan bir dokuman, Console'dan
 * elle duzenleme) Kişisel Bütçe sayfasini `undefined['Maaş']` gibi
 * hatalarla cokertiyordu. Diger koleksiyonlarla ayni ilke: BOZUK VERIYI
 * UYDURMA, ama eksik alt-alanlari makul varsayilanlarla doldur ki sayfa
 * en azindan acilsin.
 */
export function toSettings(data: Record<string, unknown>): Settings {
  const accounts = Array.isArray(data.accounts) ? (data.accounts as Settings['accounts']) : []
  const categories = Array.isArray(data.categories)
    ? (data.categories as Settings['categories'])
    : []
  const incomeSources = Array.isArray(data.incomeSources)
    ? (data.incomeSources as Settings['incomeSources']).map((s) => ({
        ...s,
        active: typeof s.active === 'boolean' ? s.active : true,
      }))
    : []
  const rawPlans = (
    typeof data.personalPlans === 'object' && data.personalPlans !== null ? data.personalPlans : {}
  ) as Record<string, unknown>

  return {
    accounts,
    categories,
    incomeSources,
    rates: numRecord(data.rates),
    defaultRate: optNum(data.defaultRate) ?? DEFAULT_RATE,
    fxSpreadPct: optNum(data.fxSpreadPct),
    sperrkonto: {
      totalEUR: optNum((data.sperrkonto as Record<string, unknown> | undefined)?.totalEUR) ?? null,
      monthlyReleaseEUR:
        optNum((data.sperrkonto as Record<string, unknown> | undefined)?.monthlyReleaseEUR) ?? null,
    },
    personalPlans: {
      Can: toPersonalBudgetPlan(rawPlans.Can),
      Tuğçe: toPersonalBudgetPlan(rawPlans['Tuğçe']),
    },
  }
}
