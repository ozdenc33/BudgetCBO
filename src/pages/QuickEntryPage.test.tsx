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

vi.mock('../hooks/useIncomes', () => ({
  useIncomes: () => ({ incomes: [], loading: false, error: null }),
}))

vi.mock('../hooks/useTransfers', () => ({
  useTransfers: () => ({ transfers: [], loading: false, error: null }),
}))

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'can@test.dev' }, loading: false, error: null }),
}))

vi.mock('../lib/currentPerson', () => ({
  personForEmail: () => 'Can',
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

  it('kategori secilince kaydetmeden Can/Tuğçe payi onizlemede gorunur', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByPlaceholderText('0'), '30')
    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.selectOptions(screen.getByLabelText(/^Hesap/), 'Can-DE Girokonto')

    expect(screen.getByText(/Can 15\.00 \/ Tuğçe 15\.00/)).toBeInTheDocument()
    expect(addTransaction).not.toHaveBeenCalled()
  })
})

describe('QuickEntryPage — bölüşük hesap seçimi', () => {
  it('ortak kategoride (varsayilan %50/%50) bolusuk hesap secenegi cikar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('0'), '30')
    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.selectOptions(screen.getByLabelText(/^Hesap/), 'Can-DE Girokonto')

    expect(screen.getByText(/Farklı hesaplardan bölüşerek öde/)).toBeInTheDocument()
  })

  it('toggle acilinca ikinci hesap secilebilir ve secondAccount kaydedilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('0'), '100')
    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.selectOptions(
      screen.getByLabelText(/^Hesap \(Can payı\)$|^Hesap$/),
      'Can-DE Girokonto',
    )
    await user.click(screen.getByLabelText(/Farklı hesaplardan bölüşerek öde/))
    await user.selectOptions(screen.getByLabelText('Hesap (Tuğçe payı)'), 'Tuğçe-DE Girokonto')
    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
    expect(addTransaction.mock.calls[0][0]).toMatchObject({
      account: 'Can-DE Girokonto',
      secondAccount: 'Tuğçe-DE Girokonto',
    })
  })

  it('Can hesabinda Ortak Kasa secilince Tuğçe hesabi da otomatik Ortak Kasa olur', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('0'), '100')
    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.selectOptions(
      screen.getByLabelText(/^Hesap \(Can payı\)$|^Hesap$/),
      'Can-DE Girokonto',
    )
    await user.click(screen.getByLabelText(/Farklı hesaplardan bölüşerek öde/))
    await user.selectOptions(screen.getByLabelText('Hesap (Tuğçe payı)'), 'Tuğçe-DE Girokonto')

    await user.selectOptions(screen.getByLabelText(/^Hesap \(Can payı\)$/), 'Ortak Kasa')
    expect(screen.getByLabelText('Hesap (Tuğçe payı)')).toHaveValue('Ortak Kasa')
  })
})

describe('QuickEntryPage — kategori seçilince akıllı varsayılanlar', () => {
  it('Kişisel kategoride giren kisinin kendi hesabi otomatik secilir, oran hemen gorunur', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Kişisel Market')

    expect(screen.getByLabelText(/^Hesap$/)).toHaveValue('Can-DE Girokonto')
    expect(screen.getByText('Can %100 / Tuğçe %0')).toBeInTheDocument()
  })

  it('Mike kategorisinde bolusuk odeme otomatik acilir, ikisinin de hesabi dolar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Mama')

    expect(screen.getByText('Can %50 / Tuğçe %50')).toBeInTheDocument()
    expect(screen.getByLabelText(/Farklı hesaplardan bölüşerek öde/)).toBeChecked()
    expect(screen.getByLabelText('Hesap (Can payı)')).toHaveValue('Can-DE Girokonto')
    expect(screen.getByLabelText('Hesap (Tuğçe payı)')).toHaveValue('Tuğçe-DE Girokonto')
  })

  it('Kira gibi Ortak-Ev kategorisinde Ortak Kasa otomatik secilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Kira (Kaltmiete)')

    expect(screen.getByLabelText(/^Hesap$/)).toHaveValue('Ortak Kasa')
  })
})
