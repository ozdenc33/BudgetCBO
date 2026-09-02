import { useEffect, useState } from 'react'
import { subscribeRecurring } from '../lib/firestoreRecurring'
import type { RecurringItem } from '../domain/types'

export function useRecurring() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeRecurring((data) => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  return { items, loading }
}
