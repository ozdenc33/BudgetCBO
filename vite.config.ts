import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'BudgetCBO',
        short_name: 'BudgetCBO',
        description: 'Can Berk ve Tuğçe için ortak bütçe uygulaması (BudgetCBO)',
        theme_color: '#0065bd',
        background_color: '#15181c',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // exceljs (~1MB) sadece Ice/Disa Aktarma sayfasinda kullanilir;
        // ilk acilista onbellege alinip mobil veri harcamasin diye
        // onceden indirilmez, yalnizca sayfa gercekten ziyaret
        // edildiginde indirilip cache-first ile saklanir.
        globIgnores: ['**/exceljs*.js'],
        runtimeCaching: [
          {
            urlPattern: /exceljs.*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'exceljs-chunk' },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Firebase SDK'si uygulama kodundan cok daha nadir degisir.
        // Ayri bir parcada tutulunca her kucuk arayuz degisikliginde
        // kullanicinin ~200 KB'i yeniden indirmesi gerekmez.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
