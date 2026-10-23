// v6 film studio: serves the film entry point AND the desktop demo harness.
// Aliases redirect Supabase/service imports to film-only stubs so actual
// product components render without connecting to production.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const harness = path.resolve(import.meta.dirname, 'film-harness');

export default defineConfig({
  root,
  configFile: false,
  plugins: [
    {
      name: 'film-only-backend',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!importer || (!source.startsWith('.') && !source.startsWith('/') && !path.isAbsolute(source))) return null;
        const clean = source.split('?')[0];
        const resolved = clean.startsWith('/src/')
          ? path.join(root, clean.slice(1))
          : path.resolve(path.dirname(importer.split('?')[0]), clean);
        const key = resolved.replace(/\\/g, '/').replace(/\.js$/, '').toLowerCase();
        const src = path.join(root, 'src').replace(/\\/g, '/').toLowerCase();
        if (key === `${src}/supabase`) return path.join(harness, 'fake-supabase.js');
        if (key === `${src}/auth-fetch`) return path.join(harness, 'fake-auth-fetch.js');
        return null;
      },
    },
    react(),
  ],
  server: {
    host: '127.0.0.1', port: 4200, strictPort: false, hmr: false, ws: false,
    watch: { ignored: ['**/out/**', '**/tmp/**', '**/dist*/**', '**/node_modules/**', '**/.git/**', '**/video/out/**', '**/video/assets/**'] },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Redirect Supabase client to film stub — catches `../../supabase`, `src/supabase` etc.
      [path.resolve(root, 'src/supabase.js')]: path.join(harness, 'fake-supabase.js'),
      [path.resolve(root, 'src/supabase')]: path.join(harness, 'fake-supabase.js'),
      // Auth fetch stub
      [path.resolve(root, 'src/auth-fetch.js')]: path.join(harness, 'fake-auth-fetch.js'),
      // Shadcn path alias used by WhatsAppConnectionPanel — stub it to avoid resolution error
      '@/components/ui/input-otp': path.join(harness, 'stub-input-otp.js'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime', 'react/jsx-runtime', '@tanstack/react-query'],
    entries: ['video/launch-film/app-film-v6.jsx', 'video/launch-film/film-harness/harness-app.jsx'],
  },
  cacheDir: path.resolve(root, 'node_modules/.vite-v6'),
});
