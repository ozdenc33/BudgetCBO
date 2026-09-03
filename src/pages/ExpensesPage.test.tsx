import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/constants'
import { computeTransaction } from '../domain/transactions'
import type { Transaction, TransactionDraft } from '../domain/types'

// Firestore'a ve DataProvider'a dokunmadan sayfayi test ediyoruz.

const addTransaction = vi.fn<(draft: TransactionDraft) => Promise<void>>()
let mockTransactions: Transaction[] = []

vi.mock('../lib/firestoreTransactions', () => ({
  addTransaction: (draft: TransactionDraft) => addTransaction(draft),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, loading: false, error: null }),
}))

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions: mockTransactions, loading: false, error: null }),
}))

vi.mock('../hooks/useComputedTransactions', () => ({
  useComputedTransactions: () =>
    mockTransactions.map((t) => computeTransaction(t, DEFAULT_SETTINGS)),
}))

vi.mock('../hooks/useIncomes', () => ({
  useIncomes: () => ({ incomes: [], loading: false, error: null }),
}))

vi.mock('../hooks/useTransfers', () => ({
  useTransfers: () => ({ transfers: [], loading: false, error: null }),
}))

// TL kuru otomatik cekme ozelligi firestoreSettings/fetchRate'e bagli;
// gercek Firebase baglantisi kurulmasin diye ikisi de sahteleniyor.
vi.mock('../lib/firestoreSettings', () => ({
  saveSettings: vi.fn(),
}))

vi.mock('../lib/fetchRate', () => ({
  fetchEurTryRateForDate: vi.fn(),
}))

import { ExpensesPage } from './ExpensesPage'
import { ToastProvider } from '../components/ToastProvider'

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ExpensesPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('+ Yeni harcama'))
}

beforeEach(() => {
  addTransaction.mockReset()
  addTransaction.mockResolvedValue(undefined)
  mockTransactions = []
})

describe('ExpensesPage — kişisel kategori paylaşım uyarısı', () => {
  it('Can/Tuğçe %100 degilse ONCE engellemez, "Emin misin?" sorar', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Kişisel Market')
    await user.type(screen.getByLabelText(/^Tutar$/), '20')
    await user.selectOptions(screen.getByLabelText(/^Hesap$/), 'Can-DE Girokonto')
    await user.type(screen.getByLabelText('Can %'), '50')

    expect(screen.getByText('Kişisel harcamada Can % veya Tuğçe % 100 yazın')).toBeInTheDocument()
    // Buton engellenmemis olmali (canSubmit artik bu durumda true).
    const submit = screen.getByRole('button', { name: 'Kaydet' })
    expect(submit).not.toBeDisabled()

    await user.click(submit)

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Can %50'))
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
    confirmSpy.mockRestore()
  })

  it('kullanici "Emin misin?" sorusuna hayir derse kaydetmez', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Kişisel Market')
    await user.type(screen.getByLabelText(/^Tutar$/), '20')
    await user.selectOptions(screen.getByLabelText(/^Hesap$/), 'Can-DE Girokonto')
    await user.type(screen.getByLabelText('Can %'), '50')
    await user.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(addTransaction).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('Can %100 yazilinca uyari kaybolur, onay istemeden kaydeder', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm')
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Kişisel Market')
    await user.type(screen.getByLabelText(/^Tutar$/), '20')
    await user.selectOptions(screen.getByLabelText(/^Hesap$/), 'Can-DE Girokonto')
    await user.type(screen.getByLabelText('Can %'), '100')
    await user.click(screen.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe('ExpensesPage — bölüşük hesap seçimi', () => {
  it('ortak kategoride (varsayilan %50/%50) bolusuk hesap secenegi cikar', async () => {
    const user = userEvent.setup()
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.type(screen.getByLabelText(/^Tutar$/), '30')
    await user.selectOptions(screen.getByLabelText(/^Hesap/), 'Can-DE Girokonto')

    expect(screen.getByText(/Farklı hesaplardan bölüşerek öde/)).toBeInTheDocument()
  })

  it('toggle acilinca ikinci hesap secilebilir ve secondAccount kaydedilir', async () => {
    const user = userEvent.setup()
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.type(screen.getByLabelText(/^Tutar$/), '100')
    await user.selectOptions(
      screen.getByLabelText(/^Hesap \(Can payı\)$|^Hesap$/),
      'Can-DE Girokonto',
    )
    await user.click(screen.getByLabelText(/Farklı hesaplardan bölüşerek öde/))
    await user.selectOptions(screen.getByLabelText('Hesap (Tuğçe payı)'), 'Tuğçe-DE Girokonto')
    await user.click(screen.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
    expect(addTransaction.mock.calls[0][0]).toMatchObject({
      account: 'Can-DE Girokonto',
      secondAccount: 'Tuğçe-DE Girokonto',
    })
  })

  it('toggle kapaliyken secondAccount hic gonderilmez (eski davranis)', async () => {
    const user = userEvent.setup()
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.type(screen.getByLabelText(/^Tutar$/), '100')
    await user.selectOptions(screen.getByLabelText(/^Hesap \(Can payı\)$|^Hesap$/), 'Ortak Kasa')
    await user.click(screen.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
    expect(addTransaction.mock.calls[0][0].secondAccount).toBeUndefined()
  })

  it('Can hesabinda Ortak Kasa secilince Tuğçe hesabi da otomatik Ortak Kasa olur', async () => {
    const user = userEvent.setup()
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.type(screen.getByLabelText(/^Tutar$/), '100')
    await user.selectOptions(
      screen.getByLabelText(/^Hesap \(Can payı\)$|^Hesap$/),
      'Can-DE Girokonto',
    )
    await user.click(screen.getByLabelText(/Farklı hesaplardan bölüşerek öde/))
    await user.selectOptions(screen.getByLabelText('Hesap (Tuğçe payı)'), 'Tuğçe-DE Girokonto')

    // Simdi Can tarafini Ortak Kasa yapinca Tugce tarafi de otomatik Ortak Kasa olmali.
    await user.selectOptions(screen.getByLabelText(/^Hesap \(Can payı\)$/), 'Ortak Kasa')
    expect(screen.getByLabelText('Hesap (Tuğçe payı)')).toHaveValue('Ortak Kasa')
  })

  it('Can/Tuğçe %100 iken bolusuk hesap secenegi hic cikmaz', async () => {
    const user = userEvent.setup()
    renderPage()
    await openForm(user)

    await user.selectOptions(screen.getByLabelText(/^Kategori$/), 'Market (Ev)')
    await user.type(screen.getByLabelText(/^Tutar$/), '30')
    await user.selectOptions(screen.getByLabelText(/^Hesap/), 'Can-DE Girokonto')
    await user.type(screen.getByLabelText('Can %'), '100')

    expect(screen.queryByText(/Farklı hesaplardan bölüşerek öde/)).not.toBeInTheDocument()
  })
})
