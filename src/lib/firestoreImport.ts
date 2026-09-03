import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import type { ImportResult } from '../domain/excelImport'

const BATCH_SIZE = 450

/** Ice aktarilan kayitlarin hepsinde bulunan alan. */
export const IMPORT_BATCH_FIELD = 'importBatchId'

const IMPORTED_COLLECTIONS = ['transactions', 'incomes', 'transfers', 'recurring', 'goals'] as const

export type ImportCounts = {
  batchId: string
  transactions: number
  incomes: number
  transfers: number
  recurring: number
  goals: number
  total: number
}

function newBatchId(): string {
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function bulkAdd(collectionName: string, drafts: object[], batchId: string): Promise<number> {
  const col = collection(db, collectionName)
  for (let i = 0; i < drafts.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const draft of drafts.slice(i, i + BATCH_SIZE)) {
      batch.set(doc(col), { ...draft, [IMPORT_BATCH_FIELD]: batchId })
    }
    await batch.commit()
  }
  return drafts.length
}

/**
 * Excel dosyasindaki satirlari Firestore'a ekler.
 *
 * Her calistirma kendi `importBatchId` degerini tasir. NEDEN: Ice
 * aktarma mukerrer kayit kontrolu yapmaz (uyarisi var ama engellemez);
 * yanlislikla iki kez calistirildiginda tek temizleme yolu kayitlari
 * elle silmekti. Bu alan sayesinde son ice aktarma tek dugmeyle geri
 * alinabiliyor (bkz. undoImport).
 */
export async function bulkImport(result: ImportResult): Promise<ImportCounts> {
  const batchId = newBatchId()
  const counts: ImportCounts = {
    batchId,
    transactions: await bulkAdd('transactions', result.transactions, batchId),
    incomes: await bulkAdd('incomes', result.incomes, batchId),
    transfers: await bulkAdd('transfers', result.transfers, batchId),
    recurring: await bulkAdd('recurring', result.recurring, batchId),
    goals: await bulkAdd('goals', result.goals, batchId),
    total: 0,
  }
  counts.total =
    counts.transactions + counts.incomes + counts.transfers + counts.recurring + counts.goals
  return counts
}

/**
 * Belirli bir ice aktarmayla eklenmis TUM kayitlari siler.
 *
 * Yalnizca o partiye ait dokumanlar silinir; elle girilen kayitlara
 * dokunulmaz. Silinen kayit sayisi dondurulur.
 */
export async function undoImport(batchId: string): Promise<number> {
  let deleted = 0
  for (const collectionName of IMPORTED_COLLECTIONS) {
    const snap = await getDocs(
      query(collection(db, collectionName), where(IMPORT_BATCH_FIELD, '==', batchId)),
    )
    const docs = snap.docs
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      for (const d of docs.slice(i, i + BATCH_SIZE)) {
        batch.delete(d.ref)
      }
      await batch.commit()
      deleted += Math.min(BATCH_SIZE, docs.length - i)
    }
  }
  return deleted
}
