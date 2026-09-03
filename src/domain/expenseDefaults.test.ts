import { describe, expect, it } from 'vitest'
import { defaultAccountsForCategory } from './expenseDefaults'
import { DEFAULT_SETTINGS } from './constants'

describe('defaultAccountsForCategory', () => {
  it('Kişisel kategoride giren kisinin kendi hesabini onerir', () => {
    expect(defaultAccountsForCategory('Kişisel Market', DEFAULT_SETTINGS, 'Can')).toEqual({
      account: 'Can-DE Girokonto',
      splitAccounts: false,
      secondAccount: '',
    })
    expect(defaultAccountsForCategory('Kişisel Market', DEFAULT_SETTINGS, 'Tuğçe')).toEqual({
      account: 'Tuğçe-DE Girokonto',
      splitAccounts: false,
      secondAccount: '',
    })
  })

  it('Taşınma kategorisinde de giren kisinin kendi hesabini onerir', () => {
    expect(defaultAccountsForCategory('Kaution', DEFAULT_SETTINGS, 'Can')?.account).toBe(
      'Can-DE Girokonto',
    )
  })

  it('kisi bilinmiyorsa Kişisel/Taşınma icin oneri vermez', () => {
    expect(
      defaultAccountsForCategory('Kişisel Market', DEFAULT_SETTINGS, undefined),
    ).toBeUndefined()
  })

  it('Ortak-Ev kategorisinde Ortak Kasayi onerir', () => {
    expect(defaultAccountsForCategory('Kira (Kaltmiete)', DEFAULT_SETTINGS, 'Can')).toEqual({
      account: 'Ortak Kasa',
      splitAccounts: false,
      secondAccount: '',
    })
  })

  it('Mike kategorisinde ikisinin de kendi hesabindan yari yariya onerir', () => {
    expect(defaultAccountsForCategory('Mama', DEFAULT_SETTINGS, 'Tuğçe')).toEqual({
      account: 'Can-DE Girokonto',
      splitAccounts: true,
      secondAccount: 'Tuğçe-DE Girokonto',
    })
  })

  it('Ortak-Dışarı kategorisinde de yari yariya onerir', () => {
    const result = defaultAccountsForCategory('Restoran/Kafe', DEFAULT_SETTINGS, 'Can')
    expect(result?.splitAccounts).toBe(true)
    expect(result?.account).toBe('Can-DE Girokonto')
    expect(result?.secondAccount).toBe('Tuğçe-DE Girokonto')
  })

  it('bilinmeyen kategori icin oneri vermez', () => {
    expect(
      defaultAccountsForCategory('yok-boyle-kategori', DEFAULT_SETTINGS, 'Can'),
    ).toBeUndefined()
  })
})
