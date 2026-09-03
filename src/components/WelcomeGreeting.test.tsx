import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Karsilama notu yalnizca Tugce icin ve oturum basina BIR KEZ cikmali.

let mockUser: { uid: string; email: string } | null = null

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

let personForEmailResult: 'Can' | 'Tuğçe' | undefined
vi.mock('../lib/currentPerson', () => ({
  personForEmail: () => personForEmailResult,
}))

import { WelcomeGreeting } from './WelcomeGreeting'
import { ToastProvider } from './ToastProvider'

function renderGreeting() {
  return render(
    <ToastProvider>
      <WelcomeGreeting />
    </ToastProvider>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  mockUser = null
  personForEmailResult = undefined
})

describe('WelcomeGreeting', () => {
  it('Tuğçe giris yapinca notu gosterir', async () => {
    mockUser = { uid: 'tugce-uid', email: 'tugce@example.com' }
    personForEmailResult = 'Tuğçe'
    renderGreeting()
    expect(await screen.findByText('Hoş geldin ballı kurabiyem')).toBeInTheDocument()
  })

  it('Can giris yapinca not cikmaz', async () => {
    mockUser = { uid: 'can-uid', email: 'can@example.com' }
    personForEmailResult = 'Can'
    renderGreeting()
    await waitFor(() => {
      expect(screen.queryByText('Hoş geldin ballı kurabiyem')).not.toBeInTheDocument()
    })
  })

  it('giris yapilmamissa not cikmaz', async () => {
    renderGreeting()
    await waitFor(() => {
      expect(screen.queryByText('Hoş geldin ballı kurabiyem')).not.toBeInTheDocument()
    })
  })

  it('ayni oturumda ikinci kez cikmaz', async () => {
    mockUser = { uid: 'tugce-uid', email: 'tugce@example.com' }
    personForEmailResult = 'Tuğçe'

    const first = renderGreeting()
    expect(await screen.findByText('Hoş geldin ballı kurabiyem')).toBeInTheDocument()
    first.unmount()

    renderGreeting()
    await waitFor(() => {
      expect(screen.queryByText('Hoş geldin ballı kurabiyem')).not.toBeInTheDocument()
    })
  })
})
