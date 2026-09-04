import { useCallback, useState } from 'react'
import { getNetWorthHidden, setNetWorthHidden } from '../lib/localPrefs'

/**
 * Ana Sayfa'daki mal varligi tutarlarinin gizli/acik durumu.
 * Cihaza ozel (bkz. src/lib/localPrefs.ts) — bir telefon halka acikken
 * digeri kapali tutulabilir.
 */
export function useNetWorthHidden() {
  const [hidden, setHidden] = useState(getNetWorthHidden)

  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current
      setNetWorthHidden(next)
      return next
    })
  }, [])

  return { hidden, toggle }
}
