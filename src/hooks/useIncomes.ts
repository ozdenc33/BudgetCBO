import { useEffect, useState } from 'react'
import { subscribeIncomes } from '../lib/firestoreIncomes'
import type { Income } from '../domain/types'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useDataErrorToast } from './useDataErrorToast'

export function useIncomes() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeIncomes(
      (items) => {
        setIncomes(items)
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

  useDataErrorToast(error, 'Gelirler')

  return { incomes, loading, error }
}
