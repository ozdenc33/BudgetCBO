import { useData } from '../data/DataProvider'

// Abonelikler artik DataProvider'da tek yerde kuruluyor; bu hook'lar
// yalnizca o veriyi okur. Sayfalarin arayuzu degismedi.

export function useIncomes() {
  const data = useData()
  return { incomes: data.incomes, loading: data.loading.incomes, error: data.error }
}
