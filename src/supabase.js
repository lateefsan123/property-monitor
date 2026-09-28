import { createClient } from "@supabase/supabase-js";
import { createAuthFetch } from './auth-fetch.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingConfig = [
  !supabaseUrl ? "VITE_SUPABASE_URL" : null,
  !supabaseAnonKey ? "VITE_SUPABASE_ANON_KEY" : null,
].filter(Boolean);

export const supabaseConfigError = missingConfig.length
  ? `Missing Supabase configuration: ${missingConfig.join(", ")}.`
  : null;

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: createAuthFetch() },
    auth: { detectSessionInUrl: !window.location.pathname.startsWith('/integrations/callback/') },
  });
