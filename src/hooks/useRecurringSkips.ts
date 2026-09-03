import { useData } from '../data/DataProvider'

// Abonelikler artik DataProvider'da tek yerde kuruluyor; bu hook'lar
// yalnizca o veriyi okur. Sayfalarin arayuzu degismedi.

export function useRecurringSkips() {
  const data = useData()
  return { skips: data.recurringSkips, loading: data.loading.recurringSkips, error: data.error }
}
