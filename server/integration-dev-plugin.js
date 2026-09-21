import { loadEnv } from 'vite';
import integrations from '../api/integrations/index.js';

// Local Vite serves the same handler as Vercel. Secrets remain in Node only.
export function integrationDevPlugin() {
  return {
    name: 'repeat-integration-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, '');
      for (const [key, value] of Object.entries(env)) {
        if (/^(SUPABASE_|VITE_SUPABASE_|GOOGLE_INTEGRATION_|MICROSOFT_INTEGRATION_|INTEGRATION_ENCRYPTION_KEY)/.test(key) && !process.env[key]) process.env[key] = value;
      }
      server.middlewares.use('/api/integrations', async (req, res) => {
        let body = '';
        try {
          for await (const chunk of req) {
            body += chunk.toString();
            if (body.length > 12000) { res.statusCode = 413; res.end(); return; }
          }
          req.body = body;
          await integrations(req, res);
        } catch { res.statusCode = 400; res.end(); }
      });
    },
  };
}
