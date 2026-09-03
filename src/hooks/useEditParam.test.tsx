import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useEditParam } from './useEditParam'

type Row = { id: string; label: string }

// ExpensesPage/IncomesPage/TransfersPage'de kullanildigi sekilde bir
// prob bilesenle davranisi dogruluyoruz.
function TrackingProbe({ records, loading }: { records: Row[]; loading: boolean }) {
  let found: string | null = null
  function ProbeInner() {
    useEditParam(records, loading, (r) => {
      found = r.id
    })
    return <span data-testid="found">{found ?? 'yok'}</span>
  }
  return <ProbeInner />
}

function renderAt(path: string, records: Row[], loading = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sayfa" element={<TrackingProbe records={records} loading={loading} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('useEditParam', () => {
  it('edit parametresi eslesirse onFound tetiklenir', async () => {
    renderAt('/sayfa?edit=r1', [{ id: 'r1', label: 'Kayıt' }])
    expect(await screen.findByTestId('found')).toHaveTextContent('r1')
  })

  it('yukleme surerken tetiklenmez', () => {
    renderAt('/sayfa?edit=r1', [{ id: 'r1', label: 'Kayıt' }], true)
    expect(screen.getByTestId('found')).toHaveTextContent('yok')
  })

  it('edit parametresi yoksa tetiklenmez', () => {
    renderAt('/sayfa', [{ id: 'r1', label: 'Kayıt' }])
    expect(screen.getByTestId('found')).toHaveTextContent('yok')
  })

  it('eslesen kayit yoksa tetiklenmez', () => {
    renderAt('/sayfa?edit=yok-boyle-id', [{ id: 'r1', label: 'Kayıt' }])
    expect(screen.getByTestId('found')).toHaveTextContent('yok')
  })
})
