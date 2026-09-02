export type Currency = 'EUR' | 'TRY'

export type Person = 'Can' | 'Tuğçe'
export type AccountOwner = Person | 'Ortak Kasa'

// Kategoriye atanan ham butce tipi. "Kisisel" kategoriler, paylasim
// oranina gore Kisisel-Can / Kisisel-Tugce olarak cozumlenir (bkz.
// src/domain/transactions.ts computeTransaction).
export type CategoryBudgetType =
  | 'Ortak-Ev'
  | 'Ortak-Dışarı'
  | 'Mike'
  | 'Kişisel'
  | 'Taşınma'

// Bir islemin cozumlenmis (nihai) butce tipi.
export type BudgetType =
  | 'Ortak-Ev'
  | 'Ortak-Dışarı'
  | 'Mike'
  | 'Kişisel-Can'
  | 'Kişisel-Tuğçe'
  | 'Taşınma'

export type Account = {
  id: string
  name: string
  currency: Currency
  owner: AccountOwner
  /** Hesaplar!Başlangıç (EUR). Girilmemisse 0 sayilir. */
  startingBalanceEUR: number
}

export type Category = {
  id: string
  name: string
  budgetType: CategoryBudgetType
  /**
   * Ortak_Butce!Aylık Limit (EUR). Sadece Ortak-Ev/Ortak-Dışarı/Mike
   * tipinde anlamlidir; Excel'de aya gore degismez, tek bir sabit
   * tablodur (bkz. src/domain/dashboard.ts). Girilmemisse 0 sayilir.
   */
  monthlyLimitEUR?: number
}

export type IncomeSource = {
  id: string
  name: string
  active: boolean
}

export type Settings = {
  accounts: Account[]
  categories: Category[]
  incomeSources: IncomeSource[]
  /** monthKey (YYYY-MM) -> 1 EUR = ? TRY */
  rates: Record<string, number>
  /** Ay icin kur girilmemisse kullanilir. */
  defaultRate: number
  sperrkonto: {
    /** Toplam bloke tutar (EUR). Bilinmiyorsa null. */
    totalEUR: number | null
    /** Aylik serbest birakilan tutar (EUR). Bilinmiyorsa null. */
    monthlyReleaseEUR: number | null
  }
}

// Islemler sayfasinda A-H arasi elle doldurulan alanlar. Firestore'da
// sadece bunlar saklanir; geri kalan her sey (gri kolonlar) okuma
// aninda hesaplanir, bkz. src/domain/transactions.ts.
export type Transaction = {
  id: string
  date: string // YYYY-MM-DD
  description: string
  category: string
  amount: number
  currency: Currency | ''
  account: string
  /** 0-1 arasi oran. Doluysa Tugce % yok sayilir. */
  canPct?: number
  /** 0-1 arasi oran. */
  tugcePct?: number
  tag?: string
  note?: string
}

export type TransactionDraft = Omit<Transaction, 'id'>

export type RateSource = 'eur' | 'monthly' | 'default'

export type ComputedTransaction = Transaction & {
  monthKey: string
  rate: number
  rateSource: RateSource
  amountEUR: number | undefined
  payer: AccountOwner | ''
  ratio: number | undefined
  budgetType: BudgetType | 'Paylaşım eksik' | ''
  canShare: number | undefined
  tugceShare: number | undefined
  /** Islemler!Kontrol kolonunun karsiligi. Bos satir icin "". */
  validation: string
}

// Gelirler sayfasinda elle doldurulan alanlar.
export type Income = {
  id: string
  date: string // YYYY-MM-DD
  source: string
  person: Person
  amount: number
  currency: Currency | ''
  account: string
  note?: string
}

export type IncomeDraft = Omit<Income, 'id'>

export type ComputedIncome = Income & {
  monthKey: string
  rate: number
  rateSource: RateSource
  amountEUR: number | undefined
  /** Gelirler!Kontrol kolonunun karsiligi. Bos satir icin "". */
  validation: string
}

export type TransferType = 'Ortak Kasa Katkısı' | 'Kişiden Kişiye' | 'Tasarruf'

// Transferler sayfasinda elle doldurulan alanlar. Harcama sayilmaz.
export type Transfer = {
  id: string
  date: string // YYYY-MM-DD
  type: TransferType
  from: string
  to: string
  amount: number
  currency: Currency | ''
  fromAccount: string
  toAccount: string
  /** Tip = Tasarruf oldugunda hedefin id'si (Faz 6 oncesi kullanilmaz). */
  goalId?: string
  note?: string
}

export type TransferDraft = Omit<Transfer, 'id'>

export type ComputedTransfer = Transfer & {
  monthKey: string
  rate: number
  rateSource: RateSource
  amountEUR: number | undefined
  /** Transferler!Kontrol kolonunun karsiligi. Bos satir icin "". */
  validation: string
}

export type AccountBalance = {
  account: Account
  incomesEUR: number
  expensesEUR: number
  transfersOutEUR: number
  transfersInEUR: number
  balanceEUR: number
}
