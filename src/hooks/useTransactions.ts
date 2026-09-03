import { useEffect, useState } from 'react'
import { subscribeTransactions } from '../lib/firestoreTransactions'
import type { Transaction } from '../domain/types'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useDataErrorToast } from './useDataErrorToast'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeTransactions(
      (items) => {
        setTransactions(items)
        setError(null)
        setLoading(false)
      },
      (err) => {
        // Hata gelirse yukleme durumu kapanmali; aksi halde ekran
        // sonsuza kadar "Yükleniyor..." kalirdi.
        setError(firestoreErrorMessage(err))
        setLoading(false)
      },
    )
  }, [])

  useDataErrorToast(error, 'Harcamalar')

  return { transactions, loading, error }
}
