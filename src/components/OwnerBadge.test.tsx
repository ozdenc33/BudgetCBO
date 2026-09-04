import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OwnerBadge } from './OwnerBadge'

describe('OwnerBadge', () => {
  it('Can icin C harfi gosterir', () => {
    const { getByTitle } = render(<OwnerBadge owner="Can" />)
    expect(getByTitle('Can')).toHaveTextContent('C')
  })

  it('Tuğçe icin T harfi gosterir', () => {
    const { getByTitle } = render(<OwnerBadge owner="Tuğçe" />)
    expect(getByTitle('Tuğçe')).toHaveTextContent('T')
  })

  it('Ortak Kasa icin O harfi gosterir', () => {
    const { getByTitle } = render(<OwnerBadge owner="Ortak Kasa" />)
    expect(getByTitle('Ortak Kasa')).toHaveTextContent('O')
  })

  it('owner yoksa hicbir sey render etmez', () => {
    const { container } = render(<OwnerBadge owner={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
