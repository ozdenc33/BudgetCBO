import type { ComputedGoal, Goal, Person, Transfer } from './types'
import { computeTransfer } from './transfers'
import type { Settings } from './types'

// Hedefler sayfasinin birebir karsiligidir: Biriken (E), Kalan (F),
// Ilerleme % (G), Kalan Ay (H, TODAY() bazli), Aylik Gereken (I), Can/
// Tugce Katkisi (J/K). Tum zamanlarin toplamidir, secili aya bagli
// degildir (Hedefler sayfasinda da B1 referansi yok).

const DAYS_PER_MONTH = 30.4

function contributionsToGoal(
  goalName: string,
  from: Person,
  computedTransfers: ReturnType<typeof computeTransfer>[],
): number {
  return computedTransfers
    .filter((t) => t.type === 'Tasarruf' && t.to === goalName && t.from === from)
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
}

function computeOne(
  goal: Goal,
  computedTransfers: ReturnType<typeof computeTransfer>[],
  today: Date,
): ComputedGoal {
  const accumulatedEUR = computedTransfers
    .filter((t) => t.type === 'Tasarruf' && t.to === goal.name)
    .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)

  const remainingEUR = goal.targetAmount != null ? goal.targetAmount - accumulatedEUR : undefined
  const progressPct =
    goal.targetAmount != null && goal.targetAmount !== 0
      ? accumulatedEUR / goal.targetAmount
      : undefined

  let remainingMonths: number | undefined
  if (goal.targetDate) {
    const target = new Date(goal.targetDate + 'T00:00:00Z')
    const diffDays =
      (target.getTime() - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86_400_000
    remainingMonths = Math.max(0, Math.round(diffDays / DAYS_PER_MONTH))
  }

  let monthlyRequiredEUR: number | undefined
  if (remainingEUR != null && remainingMonths != null) {
    monthlyRequiredEUR =
      remainingMonths === 0 ? remainingEUR : Math.max(0, remainingEUR / remainingMonths)
  }

  return {
    ...goal,
    accumulatedEUR,
    remainingEUR,
    progressPct,
    remainingMonths,
    monthlyRequiredEUR,
    canContributionEUR: contributionsToGoal(goal.name, 'Can', computedTransfers),
    tugceContributionEUR: contributionsToGoal(goal.name, 'Tuğçe', computedTransfers),
  }
}

export function computeGoal(
  goal: Goal,
  transfers: Transfer[],
  settings: Settings,
  today: Date,
): ComputedGoal {
  const computedTransfers = transfers.map((t) => computeTransfer(t, settings))
  return computeOne(goal, computedTransfers, today)
}

export function computeGoals(
  goals: Goal[],
  transfers: Transfer[],
  settings: Settings,
  today: Date,
): ComputedGoal[] {
  const computedTransfers = transfers.map((t) => computeTransfer(t, settings))
  return goals.map((g) => computeOne(g, computedTransfers, today))
}
