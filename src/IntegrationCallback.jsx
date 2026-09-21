import { useEffect, useState } from 'react';
import { integrationRequest } from './integration-client';
import { mobileIntegrationCallback } from './integration-mobile-callback';
import './styles/integration-connections.css';

// Capture once, remove provider credentials from browser history immediately.
const url = new URL(window.location.href);
const callback = { action: 'complete', provider: url.pathname.split('/').pop(),
  state: url.searchParams.get('state'), code: url.searchParams.get('code'), error: url.searchParams.get('error') };
window.history.replaceState(null, '', url.pathname);
const mobileReturn = mobileIntegrationCallback(callback);
let completion;
export default function IntegrationCallback() {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (mobileReturn) { window.location.replace(mobileReturn); return; }
    let active = true;
    // StrictMode remounts must not consume the one-time OAuth code twice.
    completion ||= integrationRequest(callback).then(value => ({ value }), error => ({ error: error.message }));
    completion.then(result => { if (active) setResult(result); });
    return () => { active = false; };
  }, []);
  if (mobileReturn) return <main className="integration-callback"><h1>Return to Repeat AI</h1><p>Finish connecting securely in the mobile app.</p><a href={mobileReturn}>Open Repeat AI</a></main>;
  return <main className="integration-callback">
    <h1>{!result ? 'Connecting…' : result.error ? 'Connection not completed' : result.value.status === 'cancelled' ? 'Connection cancelled' : 'You’re connected'}</h1>
    <p role="status">{result?.error || (result ? 'Return to Repeat AI and open Settings → Integrations.' : 'Finishing your secure connection.')}</p>
    {result && <a href="/">Back to Repeat AI</a>}
  </main>;
}
