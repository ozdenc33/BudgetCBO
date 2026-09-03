import { useEffect, useState } from 'react'
import { subscribeRecurringSkips } from '../lib/firestoreRecurringSkips'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useDataErrorToast } from './useDataErrorToast'
import type { RecurringSkip } from '../domain/types'

export function useRecurringSkips() {
  const [skips, setSkips] = useState<RecurringSkip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeRecurringSkips(
      (data) => {
        setSkips(data)
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(firestoreErrorMessage(err))
        setLoading(false)
      },
    )
  }, [])

  useDataErrorToast(error, 'Atlanan sabit giderler')

  return { skips, loading, error }
}
