import { useEffect, useState } from 'react';
import { integrationRequest } from './integration-client';
import { mobileIntegrationCallback } from './integration-mobile-callback';
import { peekSpreadsheetImport, SPREADSHEET_IMPORT_RETURN_PATH } from './integration-resume';
import './styles/integration-connections.css';

// Capture once, remove provider credentials from browser history immediately.
const url = new URL(window.location.href);
const callback = { action: 'complete', provider: url.pathname.split('/').pop(),
  state: url.searchParams.get('state'), code: url.searchParams.get('code'), error: url.searchParams.get('error') };
window.history.replaceState(null, '', url.pathname);
const mobileReturn = mobileIntegrationCallback(callback);
const resumeImport = !mobileReturn && Boolean(peekSpreadsheetImport());
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
  const connected = result && !result.error && result.value.status !== 'cancelled';
  useEffect(() => {
    // A spreadsheet import started this connection: go straight back to it.
    if (connected && resumeImport) window.location.replace(SPREADSHEET_IMPORT_RETURN_PATH);
  }, [connected]);
  if (mobileReturn) return <main className="integration-callback"><h1>Return to Repeat AI</h1><p>Finish connecting securely in the mobile app.</p><a href={mobileReturn}>Open Repeat AI</a></main>;
  return <main className="integration-callback">
    <h1>{!result ? 'Connecting…' : result.error ? 'Connection not completed' : result.value.status === 'cancelled' ? 'Connection cancelled' : 'You’re connected'}</h1>
    <p role="status">{result?.error || (!result ? 'Finishing your secure connection.' : resumeImport ? 'Taking you back to your spreadsheet import…' : 'Return to Repeat AI and open Settings → Integrations.')}</p>
    {result && (resumeImport
      ? <a href={SPREADSHEET_IMPORT_RETURN_PATH}>Back to spreadsheet import</a>
      : <a href="/">Back to Repeat AI</a>)}
  </main>;
}
