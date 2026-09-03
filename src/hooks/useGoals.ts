import { useData } from '../data/DataProvider'

// Abonelikler artik DataProvider'da tek yerde kuruluyor; bu hook'lar
// yalnizca o veriyi okur. Sayfalarin arayuzu degismedi.

export function useGoals() {
  const data = useData()
  return { goals: data.goals, loading: data.loading.goals, error: data.error }
}
