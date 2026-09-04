import { useCallback } from 'react'
import { useToast } from '../components/ToastProvider'
import { commitWrite } from '../lib/firestoreWrite'
import { firestoreErrorMessage } from '../domain/firestoreErrors'

export type RunWriteOptions = {
  /** Basarili olursa gosterilecek kisa not (opsiyonel). */
  successMessage?: string
  /** Hata mesajinin basina eklenir, ornegin "Harcama kaydedilemedi". */
  failureMessage?: string
  /** Basari bildirimine eklenecek "Geri al" dugmesi (opsiyonel). */
  undo?: { label: string; onUndo: () => void }
}

/**
 * Firestore yazmalarini tek elden calistirir: hatayi kullaniciya
 * gosterir, cevrimdisi durumda arayuzu kilitlemez (bkz.
 * src/lib/firestoreWrite.ts) ve gec gelen hatalari da bildirir.
 *
 * Donen deger islemin BASARIYLA kuyruga girip girmedigidir; cagiran
 * sayfa buna bakarak formu temizler.
 */
export function useWrite() {
  const { showToast } = useToast()

  return useCallback(
    async (write: Promise<unknown>, options: RunWriteOptions = {}): Promise<boolean> => {
      const failure = options.failureMessage ?? 'Kayıt yapılamadı'
      try {
        const outcome = await commitWrite(write, (err) => {
          console.error(failure, err)
          showToast({
            message: `${failure}: ${firestoreErrorMessage(err)}`,
            tone: 'error',
            durationMs: 8000,
          })
        })

        if (outcome === 'pending') {
          showToast({
            message: 'Çevrimdışısınız — kayıt cihazda saklandı, bağlantı gelince eşitlenecek.',
            tone: 'info',
            key: 'offline-write',
          })
        } else if (options.successMessage) {
          showToast({
            message: options.successMessage,
            tone: 'success',
            action: options.undo
              ? { label: options.undo.label, onClick: options.undo.onUndo }
              : undefined,
            durationMs: options.undo ? 6000 : 3000,
          })
        }
        return true
      } catch (err) {
        console.error(failure, err)
        showToast({
          message: `${failure}: ${firestoreErrorMessage(err)}`,
          tone: 'error',
          durationMs: 8000,
        })
        return false
      }
    },
    [showToast],
  )
}
