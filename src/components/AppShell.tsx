import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { OfflineBanner } from './OfflineBanner'
import {
  IconChart,
  IconClose,
  IconExchange,
  IconHome,
  IconIncome,
  IconLogout,
  IconMenu,
  IconPerson,
  IconPlus,
  IconReceipt,
  IconRepeat,
  IconSettings,
  IconTarget,
  IconTransfer,
  IconWallet,
} from './icons'

// Menudeki tum moduller, isleve gore grupli. Alt sekme cubugunda
// yalnizca en sik kullanilan 4 tanesi + hizli giris var; geri kalanina
// buradan ulasiliyor (eskiden her seye ana sayfadan gidiliyordu).
const MENU_GROUPS: {
  title: string
  items: { to: string; label: string; icon: ReactNode; hint: string }[]
}[] = [
  {
    title: 'Kayıt',
    items: [
      { to: '/harcamalar', label: 'Harcamalar', icon: <IconReceipt />, hint: 'Harcama gir ve düzenle' },
      { to: '/gelirler', label: 'Gelirler', icon: <IconIncome />, hint: 'Maaş, burs, Sperrkonto' },
      { to: '/transferler', label: 'Transferler', icon: <IconTransfer />, hint: 'Ortak Kasa, tasarruf, hedef' },
    ],
  },
  {
    title: 'Plan',
    items: [
      { to: '/sabit-giderler', label: 'Sabit Giderler', icon: <IconRepeat />, hint: 'Kira, sigorta, abonelik' },
      { to: '/kisisel-butce', label: 'Kişisel Bütçe', icon: <IconPerson />, hint: 'Can ve Tuğçe planı' },
      { to: '/hedefler', label: 'Hedefler', icon: <IconTarget />, hint: 'Birikim hedefleri' },
    ],
  },
  {
    title: 'Rapor',
    items: [
      { to: '/pano', label: 'Ay Panosu', icon: <IconChart />, hint: 'Özet, kırılım, kontroller' },
      { to: '/hesaplar', label: 'Hesap Bakiyeleri', icon: <IconWallet />, hint: 'Bakiye ve katkı özeti' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { to: '/ayarlar', label: 'Ayarlar', icon: <IconSettings />, hint: 'Hesap, kategori, kur' },
      { to: '/ice-disa-aktar', label: 'İçe/Dışa Aktar', icon: <IconExchange />, hint: 'Excel yedek ve aktarım' },
    ],
  },
]

// Alt cubukta 5 yuva var (ortadaki hizli giris). Hesaplar ve digerlerine
// menuden ve ana sayfadaki kisayollardan ulasiliyor.
const TABS = [
  { to: '/', label: 'Özet', icon: <IconHome />, end: true },
  { to: '/pano', label: 'Pano', icon: <IconChart />, end: false },
  { to: '/harcamalar', label: 'Harcama', icon: <IconReceipt />, end: false },
]

type AppShellProps = {
  title: string
  /** Basligin altinda kucuk aciklama satiri (opsiyonel). */
  subtitle?: string
  children: ReactNode
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()

  // Sayfa degisince menu kapansin.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Menu acikken Escape ile kapatma ve arka planin kaymasini engelleme.
  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="app-shell">
      <OfflineBanner />

      <header className="app-bar">
        <div className="app-bar-text">
          <h1 className="app-bar-title">{title}</h1>
          {subtitle && <p className="app-bar-subtitle">{subtitle}</p>}
        </div>
        <div className="app-bar-actions">
          <ThemeToggle />
        </div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="tab-bar" aria-label="Ana gezinme">
        {TABS.slice(0, 2).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? 'tab tab--active' : 'tab')}
          >
            {t.icon}
            <span>{t.label}</span>
          </NavLink>
        ))}

        <NavLink
          to="/hizli-giris"
          className={({ isActive }) => (isActive ? 'tab tab-quick tab-quick--active' : 'tab tab-quick')}
          aria-label="Hızlı harcama girişi"
        >
          <span className="tab-quick-circle">
            <IconPlus size={24} />
          </span>
          <span>Hızlı</span>
        </NavLink>

        {TABS.slice(2).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? 'tab tab--active' : 'tab')}
          >
            {t.icon}
            <span>{t.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className={menuOpen ? 'tab tab--active' : 'tab'}
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
        >
          <IconMenu />
          <span>Menü</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Tüm modüller"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-header">
              <div>
                <p className="sheet-title">Tüm modüller</p>
                {user?.email && <p className="sheet-user">{user.email}</p>}
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Menüyü kapat"
              >
                <IconClose size={20} />
              </button>
            </div>

            <div className="sheet-body">
              {MENU_GROUPS.map((group) => (
                <section key={group.title} className="sheet-group">
                  <h2 className="sheet-group-title">{group.title}</h2>
                  <div className="sheet-links">
                    {group.items.map((item) => (
                      <Link key={item.to} to={item.to} className="sheet-link">
                        <span className="sheet-link-icon">{item.icon}</span>
                        <span className="sheet-link-text">
                          <span className="sheet-link-label">{item.label}</span>
                          <span className="sheet-link-hint">{item.hint}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}

              <button type="button" className="sheet-signout" onClick={() => signOut()}>
                <IconLogout size={18} />
                Çıkış yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
