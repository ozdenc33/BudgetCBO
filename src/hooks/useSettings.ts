import { useEffect, useState } from 'react'
import { ensureSettingsSeeded, subscribeSettings } from '../lib/firestoreSettings'
import { DEFAULT_SETTINGS } from '../domain/constants'
import type { Settings } from '../domain/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ensureSettingsSeeded().catch((err) => {
      console.error('Ayarlar tohumlanamadi', err)
    })
    const unsub = subscribeSettings((s) => {
      setSettings(s)
      setLoading(false)
    })
    return unsub
  }, [])

  return { settings, loading }
}
