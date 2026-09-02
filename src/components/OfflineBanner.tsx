import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div className="offline-banner">
      Çevrimdışı — girdikleriniz cihazda saklanıyor, bağlantı gelince otomatik eşitlenecek.
    </div>
  )
}
