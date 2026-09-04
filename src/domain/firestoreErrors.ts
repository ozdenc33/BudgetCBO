/**
 * Firestore hata kodunu okunur bir mesaja cevirir.
 *
 * NEDEN: Yazma islemlerinin hicbirinde catch yoktu; hata "unhandled
 * rejection" olarak konsola bile duzgun dusmuyordu ve kullanici kaydin
 * gitmedigini fark etmiyordu.
 */
export function firestoreErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : ''
  switch (code) {
    case 'permission-denied':
      return 'Bu işlem için yetkiniz yok. (Firestore kuralları reddetti.)'
    case 'unavailable':
      return 'Sunucuya ulaşılamadı. Bağlantı gelince tekrar denenecek.'
    case 'unauthenticated':
      return 'Oturumunuz düşmüş görünüyor. Tekrar giriş yapın.'
    case 'not-found':
      return 'Kayıt bulunamadı; başka bir cihazdan silinmiş olabilir.'
    case 'resource-exhausted':
      return 'Günlük Firestore kotası dolmuş olabilir. Daha sonra tekrar deneyin.'
    case 'invalid-argument':
      return 'Kayıt biçimi geçersiz, kaydedilemedi.'
    case 'deadline-exceeded':
      return 'İşlem zaman aşımına uğradı. Tekrar deneyin.'
    default:
      return 'Beklenmeyen bir hata oluştu.'
  }
}
