import { useEffect, useState } from 'react'
import { subscribeRecurringSkips } from '../lib/firestoreRecurringSkips'
import type { RecurringSkip } from '../domain/types'

export function useRecurringSkips() {
  const [skips, setSkips] = useState<RecurringSkip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeRecurringSkips((data) => {
      setSkips(data)
      setLoading(false)
    })
  }, [])

  return { skips, loading }
}
