import { useEffect, useState } from 'react'
import { subscribeTransfers } from '../lib/firestoreTransfers'
import type { Transfer } from '../domain/types'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useDataErrorToast } from './useDataErrorToast'

export function useTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeTransfers(
      (items) => {
        setTransfers(items)
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

  useDataErrorToast(error, 'Transferler')

  return { transfers, loading, error }
}
