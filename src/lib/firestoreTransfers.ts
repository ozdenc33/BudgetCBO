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
import { toTransfer } from './normalize'
import type { Transfer, TransferDraft } from '../domain/types'

const TRANSFERS = collection(db, 'transfers')

export function subscribeTransfers(
  onChange: (transfers: Transfer[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return subscribeCollection(TRANSFERS, toTransfer, onChange, onError)
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
