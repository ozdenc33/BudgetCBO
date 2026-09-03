import { useEffect, useState } from 'react'
import { localISO } from '../domain/dates'

/**
 * "Bugun" degeri, yerel gece yarisi gecildiginde kendini tazeler.
 *
 * NEDEN: Sayfalar `useMemo(() => new Date(), [])` kullaniyordu. Uygulama
 * telefonda PWA olarak acik birakildiginda (ki normal kullanim bu) gece
 * yarisindan sonra bu deger bayatliyor: "ileri tarihli" rozeti yanlis
 * kayitlara takiliyor, hatirlatmalarin kalan gun sayisi bir fazla
 * kaliyor, "bu hafta" ozeti eski gune gore hesaplaniyordu.
 *
 * Sonuc referansi yalnizca gun degistiginde degisir, bu yuzden bu Date'i
 * bagimlilik dizisinde kullanan useMemo'lar bosuna yeniden hesaplanmaz.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    function scheduleNextMidnight() {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      // +1 sn: zamanlayicilar erken tetiklenebilir, gun sinirini
      // kesin gectigimizden emin olalim.
      timer = setTimeout(() => {
        setToday(new Date())
        scheduleNextMidnight()
      }, nextMidnight.getTime() - now.getTime() + 1000)
    }

    // Telefon uykudayken setTimeout duraklar; uygulama one geldiginde
    // veya sekme gorunur olunca tarihi ayrica kontrol ediyoruz.
    function checkOnFocus() {
      setToday((current) => (localISO(current) === localISO(new Date()) ? current : new Date()))
    }

    scheduleNextMidnight()
    document.addEventListener('visibilitychange', checkOnFocus)
    window.addEventListener('focus', checkOnFocus)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', checkOnFocus)
      window.removeEventListener('focus', checkOnFocus)
    }
  }, [])

  return today
}
