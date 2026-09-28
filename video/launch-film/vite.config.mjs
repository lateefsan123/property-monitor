// Launch film studio: serves film.html, which renders real product components
// with demo data and exposes window.seek(t) for frame-exact capture.
// Run from the repo root: npx vite --config video/launch-film/vite.config.mjs
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
export default defineConfig({
  root,
  configFile: false,
  plugins: [react()],
  // No hot reload, so an edit can't swap code inside a page mid-capture; file
  // watching stays on so every new page load gets the current code.
  server: {
    host: '127.0.0.1', port: 4190, strictPort: true, hmr: false,
    // Rendered frames and the repo's large build/temp folders must not be watched.
    watch: { ignored: ['**/out/**', '**/tmp/**', '**/dist*/**', '**/node_modules/**', '**/.git/**', '**/video/out/**', '**/video/assets/**'] },
  },
  resolve: { dedupe: ['react', 'react-dom'] },
});
