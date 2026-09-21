import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import { createVoiceSessionHandler } from '../../server/voice-session.js';

let handler;
export default async function voice(req, res) {
  try {
    if (!handler) {
      const env = process.env;
      const db = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });
      handler = createVoiceSessionHandler({
        // Intentionally never fall back to OPENAI_API_KEY or other app credentials.
        apiKey: env.REPEAT_VOICE_OPENAI_API_KEY,
        allowedUserIds: (env.REPEAT_VOICE_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean),
        authenticate: async token => {
          const { data, error } = await db.auth.getUser(token);
          return error ? null : data.user;
        },
      });
    }
    return await handler(req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Voice is not configured yet.' }));
  }
}
