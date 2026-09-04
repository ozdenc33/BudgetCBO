import { defineConfig } from 'vitest/config'

// Firestore kural testleri: emulator'e karsi calisir, seri (tek tek)
// yurutulur cunku hepsi ayni emulator veritabanini temizler.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
