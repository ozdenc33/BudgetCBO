import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Varsayilan `npm test` yalnizca src/ altindaki testleri calistirir.
// tests/ altindaki Firestore kural testleri emulator gerektirdigi icin
// ayri bir komuttan (npm run test:rules) calisir.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // jsdom yalnizca bilesen testleri icin kurulur; saf domain testleri
    // node ortaminda kalir, aksi halde tum takim ~5 kat yavasliyor.
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
    setupFiles: ['src/test/setup.ts'],
  },
})
