import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html'
        },
        manifest: {
          name: 'Zawadi — AI-Powered Scholarship Platform for African Students',
          short_name: 'Zawadi',
          description: 'Discover and apply for verified global scholarships with Zawadi. Our AI-driven platform matches African students with life-changing opportunities.',
          theme_color: '#0e100f',
          background_color: '#0e100f',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['education', 'productivity', 'students'],
          lang: 'en',
          dir: 'ltr',
          prefer_related_applications: false,
          icons: [
            {
              src: '/pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.+\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {maxEntries: 100, maxAgeSeconds: 86400}
              }
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {maxEntries: 50, maxAgeSeconds: 300}
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
            if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
            if (id.includes('node_modules/pdfjs-dist')) return 'vendor-pdf';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-charts';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'vendor-motion';
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'vendor-react';
            if (id.includes('node_modules/react')) return 'vendor-react';
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/src/data/**', '**/uploads/**'] },
    },
  };
});

