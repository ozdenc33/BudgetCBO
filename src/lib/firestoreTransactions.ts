import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  type UpdateData,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import { subscribeCollection } from './firestoreCollection'
import { toTransaction } from './normalize'
import type { Transaction, TransactionDraft } from '../domain/types'

const TRANSACTIONS = collection(db, 'transactions')

export function subscribeTransactions(
  onChange: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return subscribeCollection(TRANSACTIONS, toTransaction, onChange, onError)
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
