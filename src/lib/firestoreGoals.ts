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
import { toGoal } from './normalize'
import type { Goal, GoalDraft } from '../domain/types'

const GOALS = collection(db, 'goals')

export function subscribeGoals(
  onChange: (goals: Goal[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return subscribeCollection(GOALS, toGoal, onChange, onError)
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
