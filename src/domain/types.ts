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
}

export type Category = {
  id: string
  name: string
  budgetType: CategoryBudgetType
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
