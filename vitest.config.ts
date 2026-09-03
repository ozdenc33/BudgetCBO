import { defineConfig } from 'vitest/config'

// Varsayilan `npm test` yalnizca src/ altindaki birim testlerini
// calistirir. tests/ altindaki Firestore kural testleri emulator
// gerektirdigi icin ayri bir komuttan (npm run test:rules) calisir.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
