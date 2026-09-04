import { describe, expect, it } from 'vitest'
import { findDuplicateTransaction } from './duplicates'
import type { Transaction, TransactionDraft } from './types'

const EXISTING: Transaction[] = [
  {
    id: '1',
    date: '2026-10-01',
    description: 'Ekim kira',
    category: 'Kira (Kaltmiete)',
    amount: 950,
    currency: 'EUR',
    account: 'Ortak Kasa',
  },
]

function draft(partial: Partial<TransactionDraft>): TransactionDraft {
  return {
    date: '2026-10-01',
    description: '',
    category: 'Kira (Kaltmiete)',
    amount: 950,
    currency: 'EUR',
    account: 'Ortak Kasa',
    ...partial,
  }
}

describe('findDuplicateTransaction', () => {
  it('ayni tarih+tutar+kategori ile eslesirse mevcut kaydi doner', () => {
    expect(findDuplicateTransaction(draft({}), EXISTING)).toBe(EXISTING[0])
  })

  it('tutar farkliysa mukerrer sayilmaz', () => {
    expect(findDuplicateTransaction(draft({ amount: 100 }), EXISTING)).toBeUndefined()
  })

  it('kategori farkliysa mukerrer sayilmaz', () => {
    expect(findDuplicateTransaction(draft({ category: 'Market (Ev)' }), EXISTING)).toBeUndefined()
  })

  it('tarih farkliysa mukerrer sayilmaz', () => {
    expect(findDuplicateTransaction(draft({ date: '2026-10-02' }), EXISTING)).toBeUndefined()
  })

  it('hesap veya aciklama farkli olsa da tarih+tutar+kategori eslesirse mukerrer sayilir', () => {
    expect(
      findDuplicateTransaction(
        draft({ account: 'Can-DE Girokonto', description: 'baska' }),
        EXISTING,
      ),
    ).toBe(EXISTING[0])
  })
})
