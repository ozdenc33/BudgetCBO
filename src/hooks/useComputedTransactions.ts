import { useData } from '../data/DataProvider'
import type { ComputedTransaction } from '../domain/types'

/**
 * Hesaplanmis islemler (bkz. DataProvider.computedTransactions).
 * Ayni dizi referansi paylasildigi icin, bunu bagimlilik olarak
 * kullanan useMemo'lar gereksiz yere yeniden calismaz.
 */
export function useComputedTransactions(): ComputedTransaction[] {
  return useData().computedTransactions
}
