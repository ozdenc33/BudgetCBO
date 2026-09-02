import { collection, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import type { ImportResult } from '../domain/excelImport'

const BATCH_SIZE = 450

async function bulkAdd(collectionName: string, drafts: object[]): Promise<number> {
  const col = collection(db, collectionName)
  for (let i = 0; i < drafts.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const draft of drafts.slice(i, i + BATCH_SIZE)) {
      batch.set(doc(col), draft)
    }
    await batch.commit()
  }
  return drafts.length
}

export async function bulkImport(result: ImportResult): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  counts.transactions = await bulkAdd('transactions', result.transactions)
  counts.incomes = await bulkAdd('incomes', result.incomes)
  counts.transfers = await bulkAdd('transfers', result.transfers)
  counts.recurring = await bulkAdd('recurring', result.recurring)
  counts.goals = await bulkAdd('goals', result.goals)
  return counts
}
