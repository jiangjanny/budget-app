import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/budget-app-/',
  server: {
    port: 5174,
    strictPort: true,
    headers: { 'Cross-Origin-Opener-Policy': 'unsafe-none' }
  }
})
