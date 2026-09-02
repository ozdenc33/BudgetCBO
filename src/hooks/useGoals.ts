import { useEffect, useState } from 'react'
import { subscribeGoals } from '../lib/firestoreGoals'
import type { Goal } from '../domain/types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeGoals((data) => {
      setGoals(data)
      setLoading(false)
    })
  }, [])

  return { goals, loading }
}
