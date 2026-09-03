import type { Person } from '../domain/types'

// Giris yapan e-postayi kisiye eslestirir. .env'deki siralama anlamlidir:
//   VITE_ALLOWED_EMAIL_1 -> Can
//   VITE_ALLOWED_EMAIL_2 -> Tuğçe
//   VITE_ALLOWED_EMAIL_3 -> Can (yedek hesap, opsiyonel)
// Bu yalnizca arayuzde "baskasinin butcesini duzenliyorsun" uyarisi icin
// kullanilir; yetki kontrolu degildir (o firestore.rules'ta UID ile yapilir).
const EMAIL_TO_PERSON: { email: string; person: Person }[] = [
  { email: import.meta.env.VITE_ALLOWED_EMAIL_1, person: 'Can' },
  { email: import.meta.env.VITE_ALLOWED_EMAIL_2, person: 'Tuğçe' },
  { email: import.meta.env.VITE_ALLOWED_EMAIL_3, person: 'Can' },
].filter((x): x is { email: string; person: Person } => Boolean(x.email))

export function personForEmail(email: string | null | undefined): Person | undefined {
  if (!email) return undefined
  const normalized = email.trim().toLowerCase()
  return EMAIL_TO_PERSON.find((x) => x.email.trim().toLowerCase() === normalized)?.person
}
