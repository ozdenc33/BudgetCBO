import type { AccountOwner } from '../domain/types'

// Bir hesabin kime ait oldugunu (Can/Tuğçe/Ortak Kasa) tek harfle
// gosteren kucuk renkli rozet. Harcama satirlarinda hangi hesaptan
// cekildigini uzun hesap adini okumadan hizlica gormek icin.
const LETTER: Record<AccountOwner, string> = { Can: 'C', Tuğçe: 'T', 'Ortak Kasa': 'O' }
const VARIANT: Record<AccountOwner, string> = { Can: 'can', Tuğçe: 'tugce', 'Ortak Kasa': 'ortak' }

export function OwnerBadge({ owner }: { owner: AccountOwner | undefined }) {
  if (!owner) return null
  return (
    <span className={`owner-badge owner-badge--${VARIANT[owner]}`} title={owner}>
      {LETTER[owner]}
    </span>
  )
}
