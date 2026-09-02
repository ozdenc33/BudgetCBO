import { useEffect, useState } from 'react'
import { subscribeTransfers } from '../lib/firestoreTransfers'
import type { Transfer } from '../domain/types'

export function useTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeTransfers((items) => {
      setTransfers(items)
      setLoading(false)
    })
  }, [])

  return { transfers, loading }
}
