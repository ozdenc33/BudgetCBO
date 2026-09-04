import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Beklenmeyen bir React hatasinda beyaz ekran yerine kurtarilabilir bir
 * ekran gosterir.
 *
 * NEDEN: Uygulama telefonda PWA olarak calisiyor. Herhangi bir sayfada
 * atilan hata tum agaci sokuyor ve kullanici bombos beyaz bir ekranla
 * kaliyordu — ne hata mesaji ne de geri donus yolu vardi.
 *
 * Hata sinirlari yalnizca sinif bilesenleriyle yazilabilir; kod
 * tabanindaki tek sinif bilesen budur.
 */

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Beklenmeyen hata', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.href = '/'
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="error-boundary" role="alert">
        <h1>Bir şeyler ters gitti</h1>
        <p>
          Bu ekran çizilirken beklenmeyen bir hata oluştu. Kayıtlarınız etkilenmedi — veriler
          Firestore'da ve cihazın önbelleğinde duruyor.
        </p>
        <pre className="error-boundary-detail">{error.message}</pre>
        <div className="error-boundary-actions">
          <button type="button" onClick={this.handleReset}>
            Tekrar dene
          </button>
          <button type="button" onClick={this.handleReload}>
            Ana sayfaya dön
          </button>
        </div>
      </div>
    )
  }
}
