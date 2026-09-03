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
import { toRecurringItem } from './normalize'
import type { RecurringItem, RecurringItemDraft } from '../domain/types'

const RECURRING = collection(db, 'recurring')

export function subscribeRecurring(
  onChange: (items: RecurringItem[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return subscribeCollection(RECURRING, toRecurringItem, onChange, onError)
}

export async function addRecurring(draft: RecurringItemDraft): Promise<void> {
  await addDoc(RECURRING, draft)
}

export async function updateRecurring(
  id: string,
  draft: UpdateData<RecurringItemDraft>,
): Promise<void> {
  await updateDoc(doc(RECURRING, id), draft)
}

export async function deleteRecurring(id: string): Promise<void> {
  await deleteDoc(doc(RECURRING, id))
}
