import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library'nin otomatik temizligi yalnizca `globals: true` ile
// devreye girer; bu projede globaller kapali oldugu icin elle
// baglaniyor. Aksi halde testler birbirinin DOM'unu goruyor.
afterEach(() => {
  cleanup()
})
