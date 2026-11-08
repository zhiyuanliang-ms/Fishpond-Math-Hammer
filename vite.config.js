import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Installable PWA ("Add to Home Screen" on iOS). The app shell is
    // precached so it opens offline; battleplan images (~21 MB) are cached on
    // first view instead of up front.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Fishpond Math Hammer',
        short_name: 'Math Hammer',
        description: 'Dice-math tools and a tactical board for Warhammer 40,000 and Age of Sigmar.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#2a2a2a',
        theme_color: '#2a2a2a',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp}'],
        globIgnores: ['battleplans-11e/**', 'imperial-aquila.png'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/battleplans-11e/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'battleplan-images',
              expiration: { maxEntries: 200 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
