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
import { toIncome } from './normalize'
import type { Income, IncomeDraft } from '../domain/types'

const INCOMES = collection(db, 'incomes')

export function subscribeIncomes(
  onChange: (incomes: Income[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return subscribeCollection(INCOMES, toIncome, onChange, onError)
}

export async function addIncome(draft: IncomeDraft): Promise<void> {
  await addDoc(INCOMES, draft)
}

export async function updateIncome(id: string, draft: UpdateData<IncomeDraft>): Promise<void> {
  await updateDoc(doc(INCOMES, id), draft)
}

export async function deleteIncome(id: string): Promise<void> {
  await deleteDoc(doc(INCOMES, id))
}
