import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const AVAILABLE_MODULES = [
  { title: 'Harcamalar', phase: 'Faz 2', to: '/harcamalar' },
  { title: 'Ayarlar', phase: 'Faz 2', to: '/ayarlar' },
  { title: 'Gelirler', phase: 'Faz 3', to: '/gelirler' },
  { title: 'Transferler', phase: 'Faz 3', to: '/transferler' },
  { title: 'Hesaplar', phase: 'Faz 3', to: '/hesaplar' },
]

const SOON_MODULES = [
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
        Faz 3: gelirler, transferler ve hesap bakiyeleri hazır. Diğer modüller
        yol haritasındaki sıraya göre eklenecek.
      </p>

      <div className="module-grid">
        {AVAILABLE_MODULES.map((m) => (
          <Link className="module-card" to={m.to} key={m.title}>
            <span className="module-title">{m.title}</span>
            <span className="module-phase">{m.phase}</span>
          </Link>
        ))}
        {SOON_MODULES.map((m) => (
          <div className="module-card module-card--soon" key={m.title}>
            <span className="module-title">{m.title}</span>
            <span className="module-phase">{m.phase} · yakında</span>
          </div>
        ))}
      </div>
    </div>
  )
}
