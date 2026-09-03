import { useCallback, useEffect, useState } from 'react'
import { getThemePreference, setThemePreference } from '../lib/localPrefs'

export type Theme = 'light' | 'dark'

// PWA manifest'teki tonlarla eslesir (bkz. vite.config.ts).
const THEME_COLOR: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#1e2228',
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
}

function readInitialTheme(): Theme {
  const stored = getThemePreference()
  if (stored) return stored
  // index.html'deki baslangic scripti sayfa boyanmadan once ayni mantikla
  // <html data-theme> yazar; tutarliligi icin buradan okunur.
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'light' || attr === 'dark') return attr
  }
  return systemPrefersDark() ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

// Tek bir yerde (App.tsx > ThemeToggle) kullanilir; birden fazla bilesen
// ayni anda cagirirsa state senkronizasyonu icin Context gerekir, ama
// tema dugmesi tek oldugu icin buna gerek yok.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    setThemePreference(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
