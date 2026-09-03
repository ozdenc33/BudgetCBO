import { useEffect, useState } from 'react'
import { subscribeGoals } from '../lib/firestoreGoals'
import type { Goal } from '../domain/types'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useDataErrorToast } from './useDataErrorToast'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeGoals(
      (data) => {
        setGoals(data)
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

  useDataErrorToast(error, 'Hedefler')

  return { goals, loading, error }
}
