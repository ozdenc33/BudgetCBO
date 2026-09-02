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
import type { Transfer, TransferDraft } from '../domain/types'

const TRANSFERS = collection(db, 'transfers')

export function subscribeTransfers(onChange: (transfers: Transfer[]) => void): Unsubscribe {
  return onSnapshot(TRANSFERS, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transfer)
    onChange(items)
  })
}

export async function addTransfer(draft: TransferDraft): Promise<void> {
  await addDoc(TRANSFERS, draft)
}

export async function updateTransfer(id: string, draft: UpdateData<TransferDraft>): Promise<void> {
  await updateDoc(doc(TRANSFERS, id), draft)
}

export async function deleteTransfer(id: string): Promise<void> {
  await deleteDoc(doc(TRANSFERS, id))
}
