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
import type { Goal, GoalDraft } from '../domain/types'

const GOALS = collection(db, 'goals')

export function subscribeGoals(onChange: (goals: Goal[]) => void): Unsubscribe {
  return onSnapshot(GOALS, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Goal)
    onChange(items)
  })
}

export async function addGoal(draft: GoalDraft): Promise<void> {
  await addDoc(GOALS, draft)
}

export async function updateGoal(id: string, draft: UpdateData<GoalDraft>): Promise<void> {
  await updateDoc(doc(GOALS, id), draft)
}

export async function deleteGoal(id: string): Promise<void> {
  await deleteDoc(doc(GOALS, id))
}
