import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { IconClose } from './icons'

// Uygulama genelinde kisa bildirimler. Uc ise birden hizmet eder:
//   1. Yazma hatalari (eskiden sessizce yutuluyordu, kullanici kaydin
//      gitmedigini anlamiyordu),
//   2. Geri alinabilir islemler (silme),
//   3. Kucuk kisisel notlar (Tuğçe'nin karsilamasi, Mike'in tesekkuru).
// Hepsi ayni bilesende, cunku ekranda ayni yeri paylasirlar.

export type ToastTone = 'info' | 'success' | 'error' | 'fun'

export type ToastOptions = {
  message: string
  tone?: ToastTone
  /** Varsayilan 4000 ms. 0 verilirse kendiliginden kapanmaz. */
  durationMs?: number
  /** Tek bir eylem dugmesi (ornegin "Geri al"). */
  action?: { label: string; onClick: () => void }
  /**
   * Ayni anahtarla gelen ikinci bildirim oncekinin yerini alir.
   * Ornegin karsilama notunun iki kez ust uste cikmasini engeller.
   */
  key?: string
}

type Toast = ToastOptions & { id: string }

type ToastApi = {
  showToast: (options: ToastOptions) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DEFAULT_DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((options: ToastOptions) => {
    const id = options.key ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    // Ayni anahtarli eski bildirimin sayaci varsa iptal et.
    const existing = timers.current.get(id)
    if (existing) clearTimeout(existing)

    setToasts((current) => [...current.filter((t) => t.id !== id), { ...options, id }])

    const duration = options.durationMs ?? DEFAULT_DURATION_MS
    if (duration > 0) {
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id)
          setToasts((current) => current.filter((t) => t.id !== id))
        }, duration),
      )
    }
  }, [])

  // Bilesen sokulurse bekleyen sayaclar kalmasin.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const api = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.tone ?? 'info'}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <span className="toast-message">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.action?.onClick()
                  dismissToast(toast.id)
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Bildirimi kapat"
            >
              <IconClose size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast, ToastProvider icinde kullanilmali')
  return ctx
}
