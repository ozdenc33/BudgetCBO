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
import type { RecurringItem, RecurringItemDraft } from '../domain/types'

const RECURRING = collection(db, 'recurring')

export function subscribeRecurring(onChange: (items: RecurringItem[]) => void): Unsubscribe {
  return onSnapshot(RECURRING, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecurringItem)
    onChange(items)
  })
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
