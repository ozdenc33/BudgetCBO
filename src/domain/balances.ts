import type {
  Account,
  AccountBalance,
  AccountCurrencyBalance,
  Income,
  Person,
  PersonNetWorth,
  Settings,
  Transaction,
  Transfer,
} from './types'
import { computeTransaction, isSplitAccountTransaction } from './transactions'
import { computeIncome } from './incomes'
import { computeTransfer } from './transfers'
import { resolveRate } from './rate'
import { todayMonthKey } from './dates'

// Hesaplar sayfasinin karsiligi: her hesap icin
// Bakiye = Gelirler - Harcamalar - Transfer Cikis + Transfer Giris.
// Excel'deki SUMIFS gibi, dogrulama (Kontrol) durumuna bakilmaksizin
// tutari olan her kayit toplama girer.
//
// NOT (Excel'den sapma, kullanici istegiyle): Excel'de bu formulun basinda
// bir "Baslangic" sutunu vardi. Kaldirildi; acilis bakiyesi artik normal
// bir gelir kaydi olarak girilir (uygulamayi kullanmaya baslamadan onceki
// bir tarihle). Sonuc bakiye ayni, ancak o kayit girildigi ayin gelir
// raporlarinda da gorunur.

function sumEUR<T>(
  items: T[],
  matches: (item: T) => boolean,
  amountEUR: (item: T) => number | undefined,
): number {
  return items.filter(matches).reduce((sum, item) => sum + (amountEUR(item) ?? 0), 0)
}

/**
 * Bir islemin, verilen hesaba dusen harcama tutari. Bolusuk cekilis
 * (bkz. Transaction.secondAccount) yoksa tum tutar tek hesaba yazilir;
 * varsa `account` tarafi canShare kadar, `secondAccount` tarafi
 * tugceShare kadar dusulur — cekilen oran HER ZAMAN maliyet payi
 * (canPct/tugcePct) ile birebir ayni (proje kararidir).
 */
function expenseContributionEUR(
  t: ReturnType<typeof computeTransaction>,
  accountName: string,
): number {
  if (!isSplitAccountTransaction(t)) {
    return t.account === accountName ? (t.amountEUR ?? 0) : 0
  }
  if (t.account === accountName) return t.canShare ?? 0
  if (t.secondAccount === accountName) return t.tugceShare ?? 0
  return 0
}

export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): AccountBalance[] {
  const computedTx = transactions.map((t) => computeTransaction(t, settings))
  const computedIncomes = incomes.map((i) => computeIncome(i, settings))
  const computedTransfers = transfers.map((t) => computeTransfer(t, settings))

  return accounts.map((account) => {
    const incomesEUR = sumEUR(
      computedIncomes,
      (i) => i.account === account.name,
      (i) => i.amountEUR,
    )
    const expensesEUR = computedTx.reduce(
      (sum, t) => sum + expenseContributionEUR(t, account.name),
      0,
    )
    const transfersOutEUR = sumEUR(
      computedTransfers,
      (t) => t.fromAccount === account.name,
      (t) => t.amountEUR,
    )
    const transfersInEUR = sumEUR(
      computedTransfers,
      (t) => t.toAccount === account.name,
      (t) => t.amountEUR,
    )
    const balanceEUR = incomesEUR - expensesEUR - transfersOutEUR + transfersInEUR

    return { account, incomesEUR, expensesEUR, transfersOutEUR, transfersInEUR, balanceEUR }
  })
}

export function netWorth(balances: AccountBalance[]): number {
  return balances.reduce((sum, b) => sum + b.balanceEUR, 0)
}

/**
 * Bir hesabin PARA BIRIMINE GORE ham (cevrilmemis) net tutari — "bu
 * hesapta kac TL, kac EUR var" sorusuna cevap. `computeAccountBalances`
 * her seyi islem aninda EUR'a cevirip tek bir bakiyede topluyordu; bu,
 * hesaplar birlestirildikten sonra (TR + DE hesabi tek hesapta) ayri
 * ayri gorunmesi icin eklendi. `liveEquivalentEUR`, GUNCEL (bugunun ay
 * kuru ya da varsayilan kur) ile hesaplanan bilgi amacli bir tahmindir;
 * raporlama/butce hesaplarinda kullanilmaz (onlar hep islem aninin
 * kurunu kullanir).
 */
export function computeAccountCurrencyBalances(
  accounts: Account[],
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): AccountCurrencyBalance[] {
  const liveMonthKey = todayMonthKey()
  const liveRate = resolveRate('TRY', liveMonthKey, settings, 'neutral').rate

  return accounts.map((account) => {
    const nativeByCurrency: Record<string, number> = { EUR: 0, TRY: 0 }

    for (const raw of incomes) {
      if (raw.account !== account.name || !raw.currency || raw.amount == null) continue
      nativeByCurrency[raw.currency] = (nativeByCurrency[raw.currency] ?? 0) + raw.amount
    }
    for (const raw of transactions) {
      if (!raw.currency || raw.amount == null) continue
      if (!isSplitAccountTransaction(raw)) {
        if (raw.account !== account.name) continue
        nativeByCurrency[raw.currency] = (nativeByCurrency[raw.currency] ?? 0) - raw.amount
        continue
      }
      // Bolusuk cekilis: ham tutar da orana gore bolunur.
      const ratio = raw.canPct ?? (raw.tugcePct != null ? 1 - raw.tugcePct : 0.5)
      if (raw.account === account.name) {
        nativeByCurrency[raw.currency] = (nativeByCurrency[raw.currency] ?? 0) - raw.amount * ratio
      }
      if (raw.secondAccount === account.name) {
        nativeByCurrency[raw.currency] =
          (nativeByCurrency[raw.currency] ?? 0) - raw.amount * (1 - ratio)
      }
    }
    for (const raw of transfers) {
      if (!raw.currency || raw.amount == null) continue
      if (raw.fromAccount === account.name) {
        nativeByCurrency[raw.currency] = (nativeByCurrency[raw.currency] ?? 0) - raw.amount
      }
      if (raw.toAccount === account.name) {
        nativeByCurrency[raw.currency] = (nativeByCurrency[raw.currency] ?? 0) + raw.amount
      }
    }

    const liveEquivalentEUR = (nativeByCurrency.EUR ?? 0) + (nativeByCurrency.TRY ?? 0) / liveRate

    return {
      account,
      nativeByCurrency: { EUR: nativeByCurrency.EUR ?? 0, TRY: nativeByCurrency.TRY ?? 0 },
      liveEquivalentEUR,
    }
  })
}

const ORTAK_KASA = 'Ortak Kasa'
const PERSONS: Person[] = ['Can', 'Tuğçe']

/**
 * "Mal varligi" (Ana Sayfa): kisinin kendi hesaplari + Ortak Kasa'daki
 * payi (esit sahiplik varsayimi, contributions.ts ile ayni mantik).
 */
export function computePersonNetWorth(
  accounts: Account[],
  transactions: Transaction[],
  incomes: Income[],
  transfers: Transfer[],
  settings: Settings,
): PersonNetWorth[] {
  const balances = computeAccountBalances(accounts, transactions, incomes, transfers, settings)
  const ortakKasaBalanceEUR = balances.find((b) => b.account.name === ORTAK_KASA)?.balanceEUR ?? 0

  return PERSONS.map((person) => {
    const ownAccounts = balances
      .filter((b) => b.account.owner === person)
      .map((b) => ({ account: b.account, balanceEUR: b.balanceEUR }))
      .sort((a, b) => b.balanceEUR - a.balanceEUR)
    const ownAccountsTotalEUR = ownAccounts.reduce((sum, a) => sum + a.balanceEUR, 0)
    const ortakKasaShareEUR = ortakKasaBalanceEUR / 2

    return {
      person,
      ownAccounts,
      ownAccountsTotalEUR,
      ortakKasaShareEUR,
      totalEUR: ownAccountsTotalEUR + ortakKasaShareEUR,
    }
  })
}
