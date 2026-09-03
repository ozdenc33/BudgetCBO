import { useData } from '../data/DataProvider'

// Abonelikler artik DataProvider'da tek yerde kuruluyor; bu hook'lar
// yalnizca o veriyi okur. Sayfalarin arayuzu degismedi.

export function useTransactions() {
  const data = useData()
  return { transactions: data.transactions, loading: data.loading.transactions, error: data.error }
}
