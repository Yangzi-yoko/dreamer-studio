import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  base: '/admin/',
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3100', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
