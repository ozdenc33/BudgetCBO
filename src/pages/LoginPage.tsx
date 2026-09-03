import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

export function LoginPage() {
  const { user, error, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await signIn(email, password)
    setSubmitting(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-toggle">
        <ThemeToggle />
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <span className="auth-brand-mark">OB</span>
          <h1>Ortak Bütçe</h1>
          <p className="auth-brand-note">Can Berk &amp; Tuğçe</p>
        </div>
        <label>
          E-posta
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Şifre
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
    </div>
  )
}
