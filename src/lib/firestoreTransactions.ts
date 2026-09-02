import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  type UpdateData,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Transaction, TransactionDraft } from '../domain/types'

const TRANSACTIONS = collection(db, 'transactions')

export function subscribeTransactions(
  onChange: (transactions: Transaction[]) => void,
): Unsubscribe {
  return onSnapshot(TRANSACTIONS, (snap) => {
    const items = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Transaction,
    )
    onChange(items)
  })
}

export async function addTransaction(draft: TransactionDraft): Promise<void> {
  await addDoc(TRANSACTIONS, draft)
}

export async function updateTransaction(
  id: string,
  draft: UpdateData<TransactionDraft>,
): Promise<void> {
  await updateDoc(doc(TRANSACTIONS, id), draft)
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(TRANSACTIONS, id))
}
