import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useToast } from './ToastProvider'
import { personForEmail } from '../lib/currentPerson'
import { welcomeNoteFor } from '../domain/personalNotes'
import { hasBeenGreeted, markGreeted } from '../lib/localPrefs'

// Giris yapan kisiye ozel kucuk karsilama notu (bkz.
// src/domain/personalNotes.ts). Ekrana bir sey cizmez, yalnizca
// bildirim tetikler; bu yuzden kabugun icinde bir kez durur.
export function WelcomeGreeting() {
  const { user } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (!user) return
    const note = welcomeNoteFor(personForEmail(user.email))
    if (!note) return
    if (hasBeenGreeted(user.uid)) return
    markGreeted(user.uid)
    showToast({
      message: note,
      tone: 'fun',
      durationMs: 5000,
      key: `welcome-${user.uid}`,
    })
  }, [user, showToast])

  return null
}
