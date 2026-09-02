import { useEffect, useState } from 'react'
import { subscribeTransactions } from '../lib/firestoreTransactions'
import type { Transaction } from '../domain/types'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeTransactions((items) => {
      setTransactions(items)
      setLoading(false)
    })
  }, [])

  return { transactions, loading }
}
