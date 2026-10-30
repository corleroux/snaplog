import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase'
          }
          if (id.includes('node_modules/@tanstack/react-query/')) {
            return 'tanstack'
          }

          // Radix UI components
          if (id.includes('node_modules/@radix-ui/')) {
            return 'radix-ui'
          }

          // Feature chunks
          if (id.includes('/src/features/vendors/') || id.includes('/src/features/uploads/')) {
            return 'vendors'
          }
          if (id.includes('/src/features/styles/') || id.includes('/src/features/fabric/')) {
            return 'styles'
          }
          if (id.includes('/src/features/events/')) {
            return 'events'
          }
          if (id.includes('/src/features/analytics/')) {
            return 'analytics'
          }
          if (id.includes('/src/features/search/') || id.includes('/src/features/filters/')) {
            return 'search'
          }

          // Utility chunks
          if (id.includes('/src/lib/utils') || id.includes('/src/lib/supabase') || id.includes('/src/lib/audit') || id.includes('/src/lib/logger')) {
            return 'lib-utils'
          }
          if (id.includes('/src/lib/offline') || id.includes('/src/lib/qrcode')) {
            return 'lib-offline'
          }
          if (id.includes('/src/lib/upload')) {
            return 'lib-upload'
          }

          // Admin routes
          if (id.includes('/src/admin/')) {
            return 'admin'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
