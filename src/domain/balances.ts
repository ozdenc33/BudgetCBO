import type {
  Account,
  AccountBalance,
  Income,
  Settings,
  Transaction,
  Transfer,
} from './types'
import { computeTransaction } from './transactions'
import { computeIncome } from './incomes'
import { computeTransfer } from './transfers'

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

function sumEUR<T>(items: T[], matches: (item: T) => boolean, amountEUR: (item: T) => number | undefined): number {
  return items.filter(matches).reduce((sum, item) => sum + (amountEUR(item) ?? 0), 0)
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
    const expensesEUR = sumEUR(
      computedTx,
      (t) => t.account === account.name,
      (t) => t.amountEUR,
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
