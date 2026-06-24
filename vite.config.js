import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@mediapipe')) return 'vendor-mediapipe'
          if (
            id.includes('three') ||
            id.includes('@react-three') ||
            id.includes('postprocessing')
          ) {
            return 'vendor-three'
          }
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true
  }
})
