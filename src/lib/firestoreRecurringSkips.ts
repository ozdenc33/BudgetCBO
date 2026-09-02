import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { RecurringSkip } from '../domain/types'

const SKIPS = collection(db, 'recurringSkips')

function skipDocId(recurringId: string, monthKey: string): string {
  return `${recurringId}_${monthKey}`
}

export function subscribeRecurringSkips(
  onChange: (skips: RecurringSkip[]) => void,
): Unsubscribe {
  return onSnapshot(SKIPS, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecurringSkip)
    onChange(items)
  })
}

/** Idempotent: ayni kalem+ay icin tekrar cagrilirsa ayni dokumani ustune yazar. */
export async function skipRecurringForMonth(recurringId: string, monthKey: string): Promise<void> {
  await setDoc(doc(SKIPS, skipDocId(recurringId, monthKey)), { recurringId, monthKey })
}

export async function unskipRecurringForMonth(recurringId: string, monthKey: string): Promise<void> {
  await deleteDoc(doc(SKIPS, skipDocId(recurringId, monthKey)))
}
