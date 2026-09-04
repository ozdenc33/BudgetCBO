import { useData } from '../data/DataProvider'

// Abonelikler artik DataProvider'da tek yerde kuruluyor; bu hook'lar
// yalnizca o veriyi okur. Sayfalarin arayuzu degismedi.

export function useRecurring() {
  const data = useData()
  return { items: data.recurring, loading: data.loading.recurring, error: data.error }
}
