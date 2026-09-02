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
import type { Income, IncomeDraft } from '../domain/types'

const INCOMES = collection(db, 'incomes')

export function subscribeIncomes(onChange: (incomes: Income[]) => void): Unsubscribe {
  return onSnapshot(INCOMES, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Income)
    onChange(items)
  })
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
