import { useEffect, useState } from 'react'
import { subscribeIncomes } from '../lib/firestoreIncomes'
import type { Income } from '../domain/types'

export function useIncomes() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeIncomes((items) => {
      setIncomes(items)
      setLoading(false)
    })
  }, [])

  return { incomes, loading }
}
