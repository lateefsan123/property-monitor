import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { integrationDevPlugin } from './server/integration-dev-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), integrationDevPlugin()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
