import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const AVAILABLE_MODULES = [
  { title: 'Harcamalar', phase: 'Faz 2', to: '/harcamalar' },
  { title: 'Ayarlar', phase: 'Faz 2', to: '/ayarlar' },
  { title: 'Gelirler', phase: 'Faz 3', to: '/gelirler' },
  { title: 'Transferler', phase: 'Faz 3', to: '/transferler' },
  { title: 'Hesaplar', phase: 'Faz 3', to: '/hesaplar' },
  { title: 'Ay Panosu', phase: 'Faz 4', to: '/pano' },
  { title: 'Sabit Giderler', phase: 'Faz 5', to: '/sabit-giderler' },
  { title: 'Kişisel Bütçe', phase: 'Faz 6', to: '/kisisel-butce' },
  { title: 'Hedefler', phase: 'Faz 6', to: '/hedefler' },
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
        Faz 6: kişisel bütçeler, hedefler ve katkı özeti (Hesap Bakiyeleri
        sayfasında) hazır. Excel'in ana iş akışları burada; Faz 7 (içe/dışa
        aktarma, offline) ve Faz 8 (hızlı giriş, hatırlatmalar) sırada.
      </p>

      <div className="module-grid">
        {AVAILABLE_MODULES.map((m) => (
          <Link className="module-card" to={m.to} key={m.title}>
            <span className="module-title">{m.title}</span>
            <span className="module-phase">{m.phase}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
