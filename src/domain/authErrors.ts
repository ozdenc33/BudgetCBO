/**
 * Firebase hata kodunu okunur bir mesaja cevirir.
 *
 * NEDEN: Onceden tum hatalar "E-posta veya sifre hatali" diye
 * gosteriliyordu. Internet yokken ya da cok fazla deneme sonrasi hesap
 * gecici kilitlendiginde kullanici sifresini bosuna tekrar tekrar
 * deniyordu.
 */
export function signInErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : ''
  switch (code) {
    case 'auth/invalid-email':
      return 'E-posta adresi geçerli görünmüyor.'
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış.'
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Bir süre bekleyip tekrar deneyin.'
    case 'auth/network-request-failed':
      return 'İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı.'
    default:
      return 'Giriş yapılamadı. Lütfen tekrar deneyin.'
  }
}
