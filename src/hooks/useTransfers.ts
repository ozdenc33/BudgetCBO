import { useData } from '../data/DataProvider'

// Abonelikler artik DataProvider'da tek yerde kuruluyor; bu hook'lar
// yalnizca o veriyi okur. Sayfalarin arayuzu degismedi.

export function useTransfers() {
  const data = useData()
  return { transfers: data.transfers, loading: data.loading.transfers, error: data.error }
}
