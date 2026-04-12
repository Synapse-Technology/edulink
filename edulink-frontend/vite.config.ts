import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Optimize chunk size by splitting vendor libraries
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          'vendor-form': ['react-hook-form', 'zod'],
          'vendor-http': ['axios'],
        }
      }
    },
    // Increase chunk size warning limit - large apps with many features are expected to be large
    // Production apps often exceed 1MB due to bundled dependencies and application code
    chunkSizeWarningLimit: 3000,
  }
})
