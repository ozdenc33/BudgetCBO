import { describe, expect, it } from 'vitest'
import { MIKE_THANKS_NOTE, isMikeExpense, welcomeNoteFor } from './personalNotes'
import { DEFAULT_SETTINGS } from './constants'

describe('welcomeNoteFor', () => {
  it('Tuğçe icin karsilama notu doner', () => {
    expect(welcomeNoteFor('Tuğçe')).toBe('Hoş geldin ballı kurabiyem')
  })

  it('Can icin not yok', () => {
    expect(welcomeNoteFor('Can')).toBeUndefined()
  })

  it('kisi bilinmiyorsa not yok', () => {
    expect(welcomeNoteFor(undefined)).toBeUndefined()
  })
})

describe('isMikeExpense', () => {
  it('Mike butce tipindeki kategorileri tanir', () => {
    expect(isMikeExpense({ category: 'Mama' }, DEFAULT_SETTINGS)).toBe(true)
    expect(isMikeExpense({ category: 'Veteriner' }, DEFAULT_SETTINGS)).toBe(true)
    expect(isMikeExpense({ category: 'Kedi Ekipman' }, DEFAULT_SETTINGS)).toBe(true)
  })

  it('diger butce tiplerinde false doner', () => {
    expect(isMikeExpense({ category: 'Market (Ev)' }, DEFAULT_SETTINGS)).toBe(false)
    expect(isMikeExpense({ category: 'Giyim' }, DEFAULT_SETTINGS)).toBe(false)
  })

  it('bos veya taninmayan kategoride false doner', () => {
    expect(isMikeExpense({ category: '' }, DEFAULT_SETTINGS)).toBe(false)
    expect(isMikeExpense({ category: 'Olmayan Kategori' }, DEFAULT_SETTINGS)).toBe(false)
  })

  it('kategori Mike tipine sonradan tasinirsa da calisir', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      categories: [
        ...DEFAULT_SETTINGS.categories,
        { id: 'kedi-oyuncak', name: 'Kedi Oyuncak', budgetType: 'Mike' as const },
      ],
    }
    expect(isMikeExpense({ category: 'Kedi Oyuncak' }, settings)).toBe(true)
  })

  it('not metni beklenen bicimde', () => {
    expect(MIKE_THANKS_NOTE).toBe('Teşekkürler 🐾 -Mike')
  })
})
