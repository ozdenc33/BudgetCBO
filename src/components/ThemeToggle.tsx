import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
      title={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M20.354 15.354A9 9 0 0 1 8.646 3.646a9.003 9.003 0 1 0 11.708 11.708Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="4.2" />
            <line x1="12" y1="19.8" x2="12" y2="22" />
            <line x1="2" y1="12" x2="4.2" y2="12" />
            <line x1="19.8" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="6.46" y2="6.46" />
            <line x1="17.54" y1="17.54" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="17.54" y2="6.46" />
            <line x1="6.46" y1="17.54" x2="4.93" y2="19.07" />
          </g>
        </svg>
      )}
    </button>
  )
}
