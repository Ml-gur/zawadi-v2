import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

// scripts/prerender.mjs overwrites dist/index.html with the prerendered home
// page, so keep an untouched copy of the SPA shell for every other route
// (vercel.json fallback) and for the service worker's navigation fallback.
// Emitted during the bundle so the PWA precache manifest includes it.
function appShell(): Plugin {
  return {
    name: 'techsari-app-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index && index.type === 'asset') {
        this.emitFile({ type: 'asset', fileName: 'app-shell.html', source: index.source });
      }
    },
  };
}

export default defineConfig(({ isSsrBuild }) => {
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isSsrBuild ? [] : [appShell()]),
      // The build-time renderer (vite build --ssr) needs no service worker
      isSsrBuild ? null : VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html'
        },
        manifest: {
          name: 'Techsari — AI-Powered Scholarship Platform for African Students',
          short_name: 'Techsari',
          description: 'Discover and apply for verified global scholarships with Techsari. Our AI-driven platform matches African students with life-changing opportunities.',
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
          // Offline / repeat-visit navigations get the plain shell, not the
          // prerendered home page that now lives at index.html
          navigateFallback: 'app-shell.html',
          navigateFallbackDenylist: [/^\/api\//, /\/sitemap\.xml$/, /\/robots\.txt$/],
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
        output: isSsrBuild ? {} : {
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

