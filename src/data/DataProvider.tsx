import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { subscribeTransactions } from '../lib/firestoreTransactions'
import { subscribeIncomes } from '../lib/firestoreIncomes'
import { subscribeTransfers } from '../lib/firestoreTransfers'
import { subscribeGoals } from '../lib/firestoreGoals'
import { subscribeRecurring } from '../lib/firestoreRecurring'
import { subscribeRecurringSkips } from '../lib/firestoreRecurringSkips'
import { ensureSettingsSeeded, subscribeSettings } from '../lib/firestoreSettings'
import { DEFAULT_SETTINGS } from '../domain/constants'
import { computeTransaction } from '../domain/transactions'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useToast } from '../components/ToastProvider'
import type {
  ComputedTransaction,
  Goal,
  Income,
  RecurringItem,
  RecurringSkip,
  Settings,
  Transaction,
  Transfer,
} from '../domain/types'

/**
 * Tum Firestore koleksiyonlarina TEK yerden abone olunur.
 *
 * NEDEN: Onceden her sayfa kendi hook'uyla ayri ayri abone oluyordu
 * (useTransactions HomePage'de, ExpensesPage'de, DashboardPage'de...).
 * Sayfa degistikce dinleyiciler sokulup yeniden kuruluyor, her gecis
 * koleksiyonun tamamini yeniden okuyordu. Iki kisilik bir uygulamada
 * bugun sorun degil, ama kayitlar yillar icinde birikince hem ucretsiz
 * katman okuma kotasi hem mobil veri anlamina gelir.
 *
 * Simdi abonelikler kabuk (AppShell) omru boyunca bir kez kurulur,
 * sayfalar ayni veriyi paylasir.
 */

type LoadingState = {
  transactions: boolean
  incomes: boolean
  transfers: boolean
  goals: boolean
  recurring: boolean
  recurringSkips: boolean
  settings: boolean
}

type DataState = {
  transactions: Transaction[]
  incomes: Income[]
  transfers: Transfer[]
  goals: Goal[]
  recurring: RecurringItem[]
  recurringSkips: RecurringSkip[]
  settings: Settings
  /**
   * Islemlerin hesaplanmis hali (Tutar EUR, Butce, Can/Tugce Payi...).
   *
   * NEDEN: Ana sayfa bu hesaplamayi tum kayitlar uzerinde bes ayri
   * gecişte tekrarliyordu (ozet, hafta, limit uyarilari, bakiyeler, son
   * kayitlar). Burada bir kez yapilip paylasiliyor; settings veya
   * transactions degismedikce yeniden hesaplanmaz.
   */
  computedTransactions: ComputedTransaction[]
  /** Her koleksiyon icin ayri yukleme durumu. */
  loading: LoadingState
  /** Ilk hata mesaji (varsa); hepsi ayrica bildirim olarak gosterilir. */
  error: string | null
}

const DataContext = createContext<DataState | null>(null)

const COLLECTION_LABELS = {
  transactions: 'Harcamalar',
  incomes: 'Gelirler',
  transfers: 'Transferler',
  goals: 'Hedefler',
  recurring: 'Sabit giderler',
  recurringSkips: 'Atlanan sabit giderler',
  settings: 'Ayarlar',
} as const

type CollectionKey = keyof typeof COLLECTION_LABELS

export function DataProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [recurringSkips, setRecurringSkips] = useState<RecurringSkip[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const [loading, setLoading] = useState<LoadingState>({
    transactions: true,
    incomes: true,
    transfers: true,
    goals: true,
    recurring: true,
    recurringSkips: true,
    settings: true,
  })
  const [errors, setErrors] = useState<Partial<Record<CollectionKey, string>>>({})

  useEffect(() => {
    function done(key: CollectionKey) {
      setLoading((current) => (current[key] ? { ...current, [key]: false } : current))
      setErrors((current) => {
        if (!(key in current)) return current
        const next = { ...current }
        delete next[key]
        return next
      })
    }

    function fail(key: CollectionKey) {
      return (err: Error) => {
        const message = firestoreErrorMessage(err)
        // Yukleme durumu MUTLAKA kapanmali; aksi halde sayfa sonsuza
        // kadar "Yükleniyor..." kalirdi (eski davranis).
        setLoading((current) => ({ ...current, [key]: false }))
        setErrors((current) => ({ ...current, [key]: message }))
        showToast({
          message: `${COLLECTION_LABELS[key]} yüklenemedi: ${message}`,
          tone: 'error',
          durationMs: 8000,
          key: `data-error-${key}`,
        })
      }
    }

    ensureSettingsSeeded().catch((err) => {
      console.error('Ayarlar tohumlanamadi', err)
    })

    const unsubs = [
      subscribeTransactions((items) => {
        setTransactions(items)
        done('transactions')
      }, fail('transactions')),
      subscribeIncomes((items) => {
        setIncomes(items)
        done('incomes')
      }, fail('incomes')),
      subscribeTransfers((items) => {
        setTransfers(items)
        done('transfers')
      }, fail('transfers')),
      subscribeGoals((items) => {
        setGoals(items)
        done('goals')
      }, fail('goals')),
      subscribeRecurring((items) => {
        setRecurring(items)
        done('recurring')
      }, fail('recurring')),
      subscribeRecurringSkips((items) => {
        setRecurringSkips(items)
        done('recurringSkips')
      }, fail('recurringSkips')),
      subscribeSettings((next) => {
        setSettings(next)
        done('settings')
      }, fail('settings')),
    ]

    return () => unsubs.forEach((unsub) => unsub())
  }, [showToast])

  const error = useMemo(() => Object.values(errors)[0] ?? null, [errors])

  const computedTransactions = useMemo(
    () => transactions.map((t) => computeTransaction(t, settings)),
    [transactions, settings],
  )

  const value = useMemo<DataState>(
    () => ({
      transactions,
      incomes,
      transfers,
      goals,
      recurring,
      recurringSkips,
      settings,
      computedTransactions,
      loading,
      error,
    }),
    [
      transactions,
      incomes,
      transfers,
      goals,
      recurring,
      recurringSkips,
      settings,
      computedTransactions,
      loading,
      error,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData, DataProvider icinde kullanilmali')
  return ctx
}
