import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/constants'
import type { Transaction, TransactionDraft } from '../domain/types'

// Firestore'a ve DataProvider'a dokunmadan sayfayi test ediyoruz:
// yazma katmani ve veri hook'lari sahte, geri kalan her sey gercek.

const addTransaction = vi.fn<(draft: TransactionDraft) => Promise<void>>()
let mockTransactions: Transaction[] = []

vi.mock('../lib/firestoreTransactions', () => ({
  addTransaction: (draft: TransactionDraft) => addTransaction(draft),
}))

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, loading: false, error: null }),
}))

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions: mockTransactions, loading: false, error: null }),
}))

import { QuickEntryPage } from './QuickEntryPage'
import { ToastProvider } from '../components/ToastProvider'

function renderPage() {
  return render(
    <ToastProvider>
      <QuickEntryPage />
    </ToastProvider>,
  )
}

async function fillAndSave(user: ReturnType<typeof userEvent.setup>, category: string) {
  await user.type(screen.getByPlaceholderText('0'), '12.5')
  await user.selectOptions(screen.getByLabelText(/Kategori/), category)
  await user.click(screen.getByRole('button', { name: /Kaydet/ }))
}

beforeEach(() => {
  addTransaction.mockReset()
  addTransaction.mockResolvedValue(undefined)
  mockTransactions = []
  localStorage.clear()
})

describe('QuickEntryPage', () => {
  it('harcamayi kaydeder ve tutari temizler', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillAndSave(user, 'Market (Ev)')

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
    expect(addTransaction.mock.calls[0][0]).toMatchObject({
      amount: 12.5,
      category: 'Market (Ev)',
      currency: 'EUR',
    })
    await waitFor(() => expect(screen.getByPlaceholderText('0')).toHaveValue(null))
  })

  it('Mike kategorisinde tesekkur notu cikar', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillAndSave(user, 'Mama')

    expect(await screen.findByText('Teşekkürler 🐾 -Mike')).toBeInTheDocument()
  })

  it('Mike disindaki kategoride tesekkur notu cikmaz', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillAndSave(user, 'Market (Ev)')

    await waitFor(() => expect(addTransaction).toHaveBeenCalled())
    expect(screen.queryByText('Teşekkürler 🐾 -Mike')).not.toBeInTheDocument()
  })

  it('mukerrer kayitta once uyarir, kaydetmez', async () => {
    const user = userEvent.setup()
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    mockTransactions = [
      {
        id: 'var',
        date: iso,
        description: 'Market',
        category: 'Market (Ev)',
        amount: 12.5,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
      },
    ]
    renderPage()
    await fillAndSave(user, 'Market (Ev)')

    expect(screen.getByText(/aynı tutar ve kategoride bir kayıt zaten var/i)).toBeInTheDocument()
    expect(addTransaction).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Yine de kaydet' }))
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
  })

  it('yazma hatasinda kullaniciyi uyarir ve formu temizlemez', async () => {
    addTransaction.mockRejectedValue(
      Object.assign(new Error('nope'), { code: 'permission-denied' }),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    renderPage()
    await fillAndSave(user, 'Market (Ev)')

    expect(await screen.findByRole('alert')).toHaveTextContent('yetkiniz yok')
    expect(screen.getByPlaceholderText('0')).toHaveValue(12.5)
  })
})
