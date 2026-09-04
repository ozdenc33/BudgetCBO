import { useData } from '../data/DataProvider'

// Abonelikler artik DataProvider'da tek yerde kuruluyor; bu hook'lar
// yalnizca o veriyi okur. Sayfalarin arayuzu degismedi.

export function useSettings() {
  const data = useData()
  return { settings: data.settings, loading: data.loading.settings, error: data.error }
}
