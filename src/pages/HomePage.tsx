import { useAuth } from '../auth/AuthContext'

const MODULES = [
  { title: 'Hızlı Giriş', phase: 'Faz 2' },
  { title: 'Harcamalar', phase: 'Faz 2' },
  { title: 'Ayarlar', phase: 'Faz 2' },
  { title: 'Gelirler', phase: 'Faz 3' },
  { title: 'Transferler', phase: 'Faz 3' },
  { title: 'Hesaplar', phase: 'Faz 3' },
  { title: 'Ay Panosu', phase: 'Faz 4' },
  { title: 'Sabit Giderler', phase: 'Faz 5' },
  { title: 'Kişisel Bütçeler', phase: 'Faz 6' },
  { title: 'Hedefler', phase: 'Faz 6' },
  { title: 'Katkı Özeti', phase: 'Faz 6' },
]

export function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <h1>Ortak Bütçe</h1>
          <p>{user?.email}</p>
        </div>
        <button onClick={() => signOut()}>Çıkış</button>
      </header>

      <p className="home-note">
        Faz 1: kimlik doğrulama ve iskelet hazır. Diğer modüller yol
        haritasındaki sıraya göre eklenecek.
      </p>

      <div className="module-grid">
        {MODULES.map((m) => (
          <div className="module-card module-card--soon" key={m.title}>
            <span className="module-title">{m.title}</span>
            <span className="module-phase">{m.phase} · yakında</span>
          </div>
        ))}
      </div>
    </div>
  )
}
