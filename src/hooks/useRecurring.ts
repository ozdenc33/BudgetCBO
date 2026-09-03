import { useEffect, useState } from 'react'
import { subscribeRecurring } from '../lib/firestoreRecurring'
import type { RecurringItem } from '../domain/types'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useDataErrorToast } from './useDataErrorToast'

export function useRecurring() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeRecurring(
      (data) => {
        setItems(data)
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

  useDataErrorToast(error, 'Sabit giderler')

  return { items, loading, error }
}
