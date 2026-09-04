import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccountOptions } from './AccountOptions'
import type { Account, AccountBalance } from '../domain/types'

function account(name: string): Account {
  return { id: name, name, owner: 'Can', currency: 'EUR' }
}

describe('AccountOptions', () => {
  it('bakiyesi bilinen hesabin option metnine bakiyeyi ekler', () => {
    const accounts = [account('Can-DE Girokonto')]
    const balances: AccountBalance[] = [
      {
        account: accounts[0],
        incomesEUR: 0,
        expensesEUR: 0,
        transfersOutEUR: 0,
        transfersInEUR: 0,
        balanceEUR: 1234.5,
      },
    ]
    const { container } = render(
      <select>
        <AccountOptions accounts={accounts} balances={balances} />
      </select>,
    )
    const option = container.querySelector('option')
    expect(option?.textContent).toBe('Can-DE Girokonto · 1.234,50 €')
    expect(option?.value).toBe('Can-DE Girokonto')
  })

  it('bakiyesi bilinmeyen hesap icin sadece adini gosterir', () => {
    const accounts = [account('Yeni Hesap')]
    const { container } = render(
      <select>
        <AccountOptions accounts={accounts} balances={[]} />
      </select>,
    )
    expect(container.querySelector('option')?.textContent).toBe('Yeni Hesap')
  })
})
