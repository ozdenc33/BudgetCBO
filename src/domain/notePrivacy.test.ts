import { describe, expect, it } from 'vitest'
import { isNoteVisibleTo, isPersonalBudgetType } from './notePrivacy'

describe('isPersonalBudgetType', () => {
  it('Kişisel-Can ve Kişisel-Tuğçe icin true doner', () => {
    expect(isPersonalBudgetType('Kişisel-Can')).toBe(true)
    expect(isPersonalBudgetType('Kişisel-Tuğçe')).toBe(true)
  })

  it('diger butce tipleri icin false doner', () => {
    expect(isPersonalBudgetType('Ortak-Ev')).toBe(false)
    expect(isPersonalBudgetType('Mike')).toBe(false)
    expect(isPersonalBudgetType('Taşınma')).toBe(false)
    expect(isPersonalBudgetType(undefined)).toBe(false)
  })
})

describe('isNoteVisibleTo', () => {
  it('kisisel disi harcamalarda herkese gorunur', () => {
    expect(isNoteVisibleTo({ budgetType: 'Ortak-Ev', payer: 'Can' }, 'Tuğçe')).toBe(true)
    expect(isNoteVisibleTo({ budgetType: 'Ortak-Ev', payer: 'Can' }, undefined)).toBe(true)
  })

  it('kisisel harcamada sadece odeyen kisiye gorunur', () => {
    expect(isNoteVisibleTo({ budgetType: 'Kişisel-Can', payer: 'Can' }, 'Can')).toBe(true)
    expect(isNoteVisibleTo({ budgetType: 'Kişisel-Can', payer: 'Can' }, 'Tuğçe')).toBe(false)
    expect(isNoteVisibleTo({ budgetType: 'Kişisel-Can', payer: 'Can' }, undefined)).toBe(false)
  })
})
