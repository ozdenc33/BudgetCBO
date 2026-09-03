import { collection, deleteDoc, doc, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'
import { subscribeCollection } from './firestoreCollection'
import { toRecurringSkip } from './normalize'
import type { RecurringSkip } from '../domain/types'

const SKIPS = collection(db, 'recurringSkips')

function skipDocId(recurringId: string, monthKey: string): string {
  return `${recurringId}_${monthKey}`
}

export function subscribeRecurringSkips(
  onChange: (skips: RecurringSkip[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return subscribeCollection(SKIPS, toRecurringSkip, onChange, onError)
}

/** Idempotent: ayni kalem+ay icin tekrar cagrilirsa ayni dokumani ustune yazar. */
export async function skipRecurringForMonth(recurringId: string, monthKey: string): Promise<void> {
  await setDoc(doc(SKIPS, skipDocId(recurringId, monthKey)), { recurringId, monthKey })
}

export async function unskipRecurringForMonth(
  recurringId: string,
  monthKey: string,
): Promise<void> {
  await deleteDoc(doc(SKIPS, skipDocId(recurringId, monthKey)))
}
