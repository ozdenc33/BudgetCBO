import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './ToastProvider'

function Trigger({ message, durationMs }: { message: string; durationMs?: number }) {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast({ message, tone: 'fun', durationMs })}>
      göster
    </button>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastProvider', () => {
  it('bildirimi gosterir', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger message="Hoş geldin ballı kurabiyem" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'göster' }))
    expect(screen.getByText('Hoş geldin ballı kurabiyem')).toBeInTheDocument()
  })

  // Sahte zamanlayici ile userEvent birlikte kirilgan calisiyor;
  // burada tek bir tiklama yetiyor, fireEvent daha guvenli.
  it('5 saniye sonra kendiliginden kaybolur', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger message="Teşekkürler 🐾 -Mike" durationMs={5000} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'göster' }))
    expect(screen.getByText('Teşekkürler 🐾 -Mike')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(4999)
    })
    expect(screen.getByText('Teşekkürler 🐾 -Mike')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2)
    })
    expect(screen.queryByText('Teşekkürler 🐾 -Mike')).not.toBeInTheDocument()
  })

  it('carpi ile kapatilabilir', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger message="Kapatılabilir not" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'göster' }))
    await user.click(screen.getByRole('button', { name: 'Bildirimi kapat' }))
    expect(screen.queryByText('Kapatılabilir not')).not.toBeInTheDocument()
  })

  it('hata bildirimini alert olarak duyurur', async () => {
    function ErrorTrigger() {
      const { showToast } = useToast()
      return (
        <button
          type="button"
          onClick={() => showToast({ message: 'Kayıt gitmedi', tone: 'error' })}
        >
          hata
        </button>
      )
    }
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'hata' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Kayıt gitmedi')
  })

  it('eylem dugmesini calistirip bildirimi kapatir', async () => {
    const onUndo = vi.fn()
    function UndoTrigger() {
      const { showToast } = useToast()
      return (
        <button
          type="button"
          onClick={() =>
            showToast({ message: 'Silindi', action: { label: 'Geri al', onClick: onUndo } })
          }
        >
          sil
        </button>
      )
    }
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <UndoTrigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'sil' }))
    await user.click(screen.getByRole('button', { name: 'Geri al' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Silindi')).not.toBeInTheDocument()
  })

  it('ayni anahtarli ikinci bildirim ilkinin yerini alir', async () => {
    function KeyedTrigger() {
      const { showToast } = useToast()
      return (
        <>
          <button type="button" onClick={() => showToast({ message: 'ilk', key: 'ayni' })}>
            bir
          </button>
          <button type="button" onClick={() => showToast({ message: 'ikinci', key: 'ayni' })}>
            iki
          </button>
        </>
      )
    }
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <KeyedTrigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'bir' }))
    await user.click(screen.getByRole('button', { name: 'iki' }))
    expect(screen.queryByText('ilk')).not.toBeInTheDocument()
    expect(screen.getByText('ikinci')).toBeInTheDocument()
  })
})
