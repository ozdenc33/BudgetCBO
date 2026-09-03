// Cihaza ozel, senkronize edilmeyen kucuk tercihler (son kullanilan
// kategoriler, varsayilan hesap). Firestore'a yazilmaz — iki kullanicinin
// telefonu farkli oldugundan bu tercihlerin ayri olmasi zaten dogrudur.
// localStorage erisimi basarisiz olabilir (ozel pencere, devre disi
// depolama); tum okuma/yazmalar sessizce basarisiz olur, uygulamayi
// bozmaz.

const RECENT_CATEGORIES_KEY = 'butce.recentCategories'
const DEFAULT_ACCOUNT_KEY = 'butce.defaultAccount'
const THEME_KEY = 'butce.theme'
const MAX_RECENT = 8

export function getRecentCategories(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_CATEGORIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function pushRecentCategory(name: string): void {
  try {
    const current = getRecentCategories().filter((c) => c !== name)
    const next = [name, ...current].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(next))
  } catch {
    // yoksay
  }
}

export function getDefaultAccount(): string | null {
  try {
    return localStorage.getItem(DEFAULT_ACCOUNT_KEY)
  } catch {
    return null
  }
}

export function setDefaultAccount(name: string): void {
  try {
    localStorage.setItem(DEFAULT_ACCOUNT_KEY, name)
  } catch {
    // yoksay
  }
}

// Acik/koyu tema tercihi de cihaza ozeldir (index.html'deki baslangic
// scripti ile ayni anahtari kullanir, bkz. src/hooks/useTheme.ts).
export function getThemePreference(): 'light' | 'dark' | null {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' ? raw : null
  } catch {
    return null
  }
}

export function setThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // yoksay
  }
}
