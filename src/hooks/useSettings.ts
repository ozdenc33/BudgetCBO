import { useEffect, useState } from 'react'
import { ensureSettingsSeeded, subscribeSettings } from '../lib/firestoreSettings'
import { DEFAULT_SETTINGS } from '../domain/constants'
import { firestoreErrorMessage } from '../domain/firestoreErrors'
import { useDataErrorToast } from './useDataErrorToast'
import type { Settings } from '../domain/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSettingsSeeded().catch((err) => {
      console.error('Ayarlar tohumlanamadi', err)
    })
    return subscribeSettings(
      (s) => {
        setSettings(s)
        setError(null)
        setLoading(false)
      },
      (err) => {
        // Ayarlar okunamazsa varsayilanlarla devam ediyoruz (uygulama
        // acilsin), ama durumu sayfalara bildiriyoruz.
        setError(firestoreErrorMessage(err))
        setLoading(false)
      },
    )
  }, [])

  useDataErrorToast(error, 'Ayarlar')

  return { settings, loading, error }
}
