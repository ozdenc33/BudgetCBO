import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_SETTINGS } from '../domain/constants'
import type { Settings } from '../domain/types'

const SETTINGS_DOC = doc(db, 'settings', 'app')

/**
 * settings/app dokumani yoksa Ayarlar sayfasindan alinan varsayilan
 * degerlerle bir kerelik olusturur. Var olan ayarlarin ustune yazmaz.
 */
export async function ensureSettingsSeeded(): Promise<void> {
  const snap = await getDoc(SETTINGS_DOC)
  if (!snap.exists()) {
    await setDoc(SETTINGS_DOC, DEFAULT_SETTINGS)
  }
}

export function subscribeSettings(
  onChange: (settings: Settings) => void,
): Unsubscribe {
  return onSnapshot(SETTINGS_DOC, (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as Settings)
    } else {
      onChange(DEFAULT_SETTINGS)
    }
  })
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setDoc(SETTINGS_DOC, settings)
}
