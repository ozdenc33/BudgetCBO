/**
 * Yazma islemlerinin cevrimdisi davranisini duzeltir.
 *
 * SORUN: Firestore'da `persistentLocalCache` acikken `await addDoc(...)`
 * promise'i SUNUCU onayina kadar cozulmez. Kayit aslinda aninda yerel
 * onbellege yazilir ve listede gorunur, ama sayfalardaki
 * `try { await ... } finally { setSaving(false) }` kalibi cevrimdisiyken
 * hic tamamlanmaz: "Kaydet" dugmesi sonsuza kadar kilitli kalir, form
 * temizlenmez. Kullaniciya kayit gitmemis gibi gorunur.
 *
 * COZUM: Yazmanin sunucu onayini kisa bir sure bekleriz. Bu surede
 * yanit gelmezse kaydin yerel olarak durdugunu kabul edip arayuzu
 * serbest birakiriz ("pending"); sunucu sonradan hata dondururse
 * `onLateError` ile bildirilir.
 */

export type WriteOutcome = 'synced' | 'pending'

/** Sunucu onayi icin beklenecek sure. Cevrimici yazmalar bunun cok altinda doner. */
export const LOCAL_ACK_MS = 800

export async function commitWrite(
  write: Promise<unknown>,
  onLateError?: (err: unknown) => void,
): Promise<WriteOutcome> {
  const synced = write.then((): WriteOutcome => 'synced')

  // Tarayici zaten cevrimdisi oldugunu biliyorsa bosuna bekleme.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    synced.catch((err) => onLateError?.(err))
    return 'pending'
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const pending = new Promise<WriteOutcome>((resolve) => {
    timer = setTimeout(() => resolve('pending'), LOCAL_ACK_MS)
  })

  try {
    const outcome = await Promise.race([synced, pending])
    if (outcome === 'pending') {
      // Buraya geldiysek yazma henuz reddedilmedi (reddedilseydi race
      // hata firlatirdi), yani gec gelecek hatayi simdi yakalayabiliriz.
      synced.catch((err) => onLateError?.(err))
    }
    return outcome
  } finally {
    if (timer) clearTimeout(timer)
  }
}
