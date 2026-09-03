import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth, ALLOWED_EMAILS } from '../firebase'
import { clearGreetings } from '../lib/localPrefs'
import { signInErrorMessage } from '../domain/authErrors'

type AuthState = {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
  }, [])

  async function signIn(email: string, password: string) {
    setError(null)
    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
      setError('Bu e-posta ile giris yapilamaz.')
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(signInErrorMessage(err))
    }
  }

  async function signOut() {
    // Karsilama notu bir sonraki giriste yeniden cikabilsin.
    clearGreetings()
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider icinde kullanilmali')
  return ctx
}
