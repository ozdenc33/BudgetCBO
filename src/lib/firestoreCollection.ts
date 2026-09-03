import { onSnapshot, type CollectionReference, type Unsubscribe } from 'firebase/firestore'

/**
 * Koleksiyon aboneliklerinin ortak govdesi.
 *
 * NEDEN: Alti koleksiyonun da `onSnapshot` cagrisinda hata geri
 * cagrisi yoktu. Kural reddi, yetki hatasi veya bozuk bir sorguda
 * `loading` sonsuza kadar true kaliyor, kullanici yalnizca
 * "Yükleniyor..." goruyor ve konsolda hicbir iz kalmiyordu.
 */
export function subscribeCollection<T>(
  ref: CollectionReference,
  toItem: (id: string, data: Record<string, unknown>) => T,
  onChange: (items: T[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    ref,
    (snap) => {
      onChange(snap.docs.map((d) => toItem(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => {
      console.error(`Firestore aboneligi basarisiz: ${ref.path}`, err)
      onError?.(err)
    },
  )
}
