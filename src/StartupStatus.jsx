import { useEffect, useState } from 'react';

export default function StartupStatus({ phase, timeoutMs = 15000 }) {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDelayed(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f5f5f5', color: '#171717' }}>
    <section style={{ maxWidth: 400, textAlign: 'center' }} aria-live="polite">
      <h1 style={{ fontSize: 24 }}>{delayed ? 'Taking longer than expected' : 'Opening Repeat AI'}</h1>
      <p style={{ lineHeight: 1.6 }}>{delayed
        ? 'We couldn’t finish connecting. Your saved login has been kept. Check your connection and try again.'
        : phase === 'session' ? 'Restoring your session…' : 'Checking your account access…'}</p>
      {delayed && <button type="button" onClick={() => window.location.reload()} style={{ background: '#171717', color: '#fff', border: 0, borderRadius: 24, padding: '14px 28px', font: 'inherit', cursor: 'pointer' }}>Try again</button>}
    </section>
  </main>;
}
