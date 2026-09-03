import { describe, expect, it } from 'vitest'
import { signInErrorMessage } from './authErrors'

// Giris hatalarinin ayirt edilmesi (bkz. AuthContext): eskiden her hata
// "E-posta veya sifre hatali" gorunuyordu ve internet yokken kullanici
// sifresini bosuna deniyordu.
describe('signInErrorMessage', () => {
  it('ag hatasini sifre hatasindan ayirir', () => {
    expect(signInErrorMessage({ code: 'auth/network-request-failed' })).toContain('İnternet')
  })

  it('cok fazla denemeyi bildirir', () => {
    expect(signInErrorMessage({ code: 'auth/too-many-requests' })).toContain('Çok fazla deneme')
  })

  it('gercek kimlik hatasinda sifre mesajini verir', () => {
    expect(signInErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      'E-posta veya şifre hatalı.',
    )
    expect(signInErrorMessage({ code: 'auth/wrong-password' })).toBe('E-posta veya şifre hatalı.')
  })

  it('devre disi hesabi bildirir', () => {
    expect(signInErrorMessage({ code: 'auth/user-disabled' })).toContain('devre dışı')
  })

  it('bilinmeyen ve bicimsiz hatalarda genel mesaj verir', () => {
    expect(signInErrorMessage({ code: 'auth/internal-error' })).toBe(
      'Giriş yapılamadı. Lütfen tekrar deneyin.',
    )
    expect(signInErrorMessage(new Error('bum'))).toBe('Giriş yapılamadı. Lütfen tekrar deneyin.')
    expect(signInErrorMessage(null)).toBe('Giriş yapılamadı. Lütfen tekrar deneyin.')
  })
})
