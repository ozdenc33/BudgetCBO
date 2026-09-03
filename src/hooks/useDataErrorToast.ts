import { useEffect } from 'react'
import { useToast } from '../components/ToastProvider'

/**
 * Bir Firestore aboneligi hata verdiginde kullaniciya bildirir.
 *
 * NEDEN: Hatayi hook'ta tutup ekrana hic yansitmamak, eski davranistan
 * (sonsuz "Yükleniyor...") yalnizca bir adim iyi olurdu. Bildirim
 * hook'un icinden tetiklenince her sayfa ayri ayri baglamak zorunda
 * kalmaz.
 *
 * `key` sayesinde ayni koleksiyon icin ayni anda birden fazla sayfa
 * abone olsa da tek bildirim gorunur.
 */
export function useDataErrorToast(error: string | null, label: string): void {
  const { showToast } = useToast()

  useEffect(() => {
    if (!error) return
    showToast({
      message: `${label} yüklenemedi: ${error}`,
      tone: 'error',
      durationMs: 8000,
      key: `data-error-${label}`,
    })
  }, [error, label, showToast])
}
