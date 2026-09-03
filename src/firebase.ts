import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Offline giris: kayitlar IndexedDB'de tutulur, internet yokken de
// okuma/yazma calisir; baglanti gelince otomatik senkronize olur.
// Ayni tarayicida birden fazla sekme acilirsa da tek bir yerel
// onbellek paylasilir (persistentMultipleTabManager).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// Yerel gelistirme icin Firebase emulator'lerine baglanma. Sadece
// VITE_USE_EMULATOR=true iken aktif olur, production build'i etkilemez.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

// VITE_ALLOWED_EMAIL_3 opsiyoneldir; Can Berk'in yedek hesabi gibi ek
// bir giris icin kullanilir (asil yetki kontrolu firestore.rules'taki
// UID beyaz listesidir, bu yalnizca giris ekranindaki ek kontroldur).
export const ALLOWED_EMAILS = [
  import.meta.env.VITE_ALLOWED_EMAIL_1,
  import.meta.env.VITE_ALLOWED_EMAIL_2,
  import.meta.env.VITE_ALLOWED_EMAIL_3,
].filter(Boolean)
