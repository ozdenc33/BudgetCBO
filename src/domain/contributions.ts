import type {
  Account,
  ContributionRow,
  Income,
  Person,
  Settings,
  Transaction,
  Transfer,
} from './types'
import { computeTransaction, isSplitAccountTransaction } from './transactions'
import { computeTransfer } from './transfers'
import { computeAccountBalances } from './balances'

// Hesaplar!A23:F29 (KATKI ÖZETİ) ile birebir karsilastirma. Tum
// zamanlarin toplamidir. "Borç" dili kullanilmaz (bkz. proje
// talimatlari bolum 5 ve 11) — sadece toplamda kim ne kadar onde
// bilgisi verilir.

const ORTAK_KASA = 'Ortak Kasa'
const PERSONS: Person[] = ['Can', 'Tuğçe']

function ortakKasaBalanceEUR(
  accounts: Account[],
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): number {
  const balances = computeAccountBalances(accounts, transactions, incomes, transfers, settings)
  return balances.find((b) => b.account.name === ORTAK_KASA)?.balanceEUR ?? 0
}

function ownerPerson(accountName: string, accounts: Account[]): Person | undefined {
  const owner = accounts.find((a) => a.name === accountName)?.owner
  return owner === 'Can' || owner === 'Tuğçe' ? owner : undefined
}

/**
 * Bir islemde, verilen kisinin KENDI cebinden (kendi hesabindan)
 * cikan tutar. Bolusuk cekiliste (bkz. isSplitAccountTransaction) her
 * taraf kendi payini (canShare/tugceShare) kendi hesabindan oder;
 * Ortak Kasa'dan cikan kisim hic kimseye "direkt odedi" olarak
 * yazilmaz (bu, "Ortak Kasa'ya katki" transferleriyle ayrica sayilir).
 */
function directPaymentEUR(
  t: ReturnType<typeof computeTransaction>,
  person: Person,
  accounts: Account[],
): number {
  if (!isSplitAccountTransaction(t)) {
    return ownerPerson(t.account, accounts) === person ? (t.amountEUR ?? 0) : 0
  }
  let sum = 0
  if (ownerPerson(t.account, accounts) === person) sum += t.canShare ?? 0
  if (ownerPerson(t.secondAccount!, accounts) === person) sum += t.tugceShare ?? 0
  return sum
}

export function computeContributionSummary(
  accounts: Account[],
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): ContributionRow[] {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  const computedTransfers = transfers.map((t) => computeTransfer(t, settings))
  const sharedAccountBalanceEUR = ortakKasaBalanceEUR(
    accounts,
    transactions,
    incomes,
    transfers,
    settings,
  )

  return PERSONS.map((person) => {
    const directlyPaidEUR = computedTx.reduce(
      (sum, t) => sum + directPaymentEUR(t, person, accounts),
      0,
    )

    const paidIntoSharedAccountEUR = computedTransfers
      .filter((t) => t.type === 'Ortak Kasa Katkısı' && t.from === person)
      .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)

    const sentToOther = computedTransfers
      .filter((t) => t.type === 'Kişiden Kişiye' && t.from === person)
      .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)
    const receivedFromOther = computedTransfers
      .filter((t) => t.type === 'Kişiden Kişiye' && t.to === person)
      .reduce((sum, t) => sum + (t.amountEUR ?? 0), 0)

    const totalContributionEUR =
      directlyPaidEUR + paidIntoSharedAccountEUR + sentToOther - receivedFromOther

    const shareColumn = person === 'Can' ? 'canShare' : 'tugceShare'
    const ownShareEUR = computedTx.reduce((sum, t) => sum + (t[shareColumn] ?? 0), 0)

    const diffEUR = totalContributionEUR - ownShareEUR - sharedAccountBalanceEUR / 2

    return {
      person,
      directlyPaidEUR,
      paidIntoSharedAccountEUR,
      totalContributionEUR,
      ownShareEUR,
      diffEUR,
    }
  })
}

export type ContributionStatus =
  { balanced: true } | { balanced: false; aheadPerson: Person; amountEUR: number }

/** Hesaplar!B28 (Durum) — "borç" dili kullanmadan sadece kim onde bilgisi. */
export function contributionStatus(rows: ContributionRow[]): ContributionStatus {
  const can = rows.find((r) => r.person === 'Can')
  if (!can || Math.round(can.diffEUR * 100) / 100 === 0) return { balanced: true }
  return {
    balanced: false,
    aheadPerson: can.diffEUR > 0 ? 'Can' : 'Tuğçe',
    amountEUR: Math.abs(can.diffEUR),
  }
}

/** Hesaplar!F29 — iki farkin toplami sifir olmali (tutarlilik kontrolu). */
export function contributionCheckEUR(rows: ContributionRow[]): number {
  return Math.round(rows.reduce((sum, r) => sum + r.diffEUR, 0) * 100) / 100 + 0
}
