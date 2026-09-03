import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Hesap Hareketleri (ekstre) sayfasindan gelen `?edit=<id>` parametresini
 * okuyup ilgili kaydi bulunca duzenleme formunu acar (bkz.
 * src/pages/AccountDetailPage.tsx editLinkFor). Bir kez tetiklenir —
 * kullanici formu kapatip baska bir kayda tiklarsa (yeni id) tekrar
 * calisir, ama ayni id icin sayfa acik kaldigi surece tekrarlamaz.
 * Parametre bulunduktan sonra URL'den silinir (geri tusuyla tekrar
 * acilmasin diye).
 */
export function useEditParam<T extends { id: string }>(
  records: T[],
  loading: boolean,
  onFound: (record: T) => void,
): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const handledId = useRef<string | null>(null)
  const editId = searchParams.get('edit')

  useEffect(() => {
    if (!editId || loading || handledId.current === editId) return
    const record = records.find((r) => r.id === editId)
    if (!record) return
    handledId.current = editId
    onFound(record)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('edit')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, loading, records])
}
