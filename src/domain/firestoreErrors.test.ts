import { describe, expect, it } from 'vitest'
import { firestoreErrorMessage } from './firestoreErrors'

describe('firestoreErrorMessage', () => {
  it('yetki hatasini ayirt eder', () => {
    expect(firestoreErrorMessage({ code: 'permission-denied' })).toContain('yetkiniz yok')
  })

  it('baglanti hatasini ayirt eder', () => {
    expect(firestoreErrorMessage({ code: 'unavailable' })).toContain('ulaşılamadı')
  })

  it('kota hatasini ayirt eder', () => {
    expect(firestoreErrorMessage({ code: 'resource-exhausted' })).toContain('kota')
  })

  it('bilinmeyen ve bicimsiz hatalarda genel mesaj verir', () => {
    expect(firestoreErrorMessage({ code: 'aborted' })).toBe('Beklenmeyen bir hata oluştu.')
    expect(firestoreErrorMessage(new Error('bum'))).toBe('Beklenmeyen bir hata oluştu.')
    expect(firestoreErrorMessage(undefined)).toBe('Beklenmeyen bir hata oluştu.')
  })
})
