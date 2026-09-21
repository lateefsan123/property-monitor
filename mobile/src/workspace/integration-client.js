import { supabase } from '../supabase';

// Provider credentials never leave the server. Every request uses the current
// Repeat AI session; signing out cannot retain another user's connection state.
export async function integrationRequest(body, signal) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sign in to use your integrations.');
  const response = await fetch('https://repeatai.org/api/integrations', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error || 'Could not load your integrations. Try again.');
  return result;
}
