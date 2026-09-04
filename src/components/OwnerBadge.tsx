import type { AccountOwner } from '../domain/types'

// Bir kaydi kimin girdigini (Can/Tuğçe) tek harfle gosteren kucuk
// renkli rozet — hangi HESAPTAN cekildiginden bagimsizdir (orn. Can
// giris yapip Tuğçe'nin hesabindan yapilan bir harcamayi girebilir;
// rozet yine "C" gosterir, cunku kaydi giren odur).
const LETTER: Record<AccountOwner, string> = { Can: 'C', Tuğçe: 'T', 'Ortak Kasa': 'O' }
const VARIANT: Record<AccountOwner, string> = { Can: 'can', Tuğçe: 'tugce', 'Ortak Kasa': 'ortak' }

export function OwnerBadge({ owner, title }: { owner: AccountOwner | undefined; title?: string }) {
  if (!owner) return null
  return (
    <span className={`owner-badge owner-badge--${VARIANT[owner]}`} title={title ?? owner}>
      {LETTER[owner]}
    </span>
  )
}
