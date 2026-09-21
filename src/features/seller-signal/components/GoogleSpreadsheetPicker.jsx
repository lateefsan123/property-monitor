import { useEffect, useState } from 'react';

export default function GoogleSpreadsheetPicker({ request, onSelect, onBrowse, disabled }) {
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(null);
  const [input, setInput] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    request({ action: 'read', provider: 'google', feature: 'sheets', input }, controller.signal)
      .then(value => { if (!controller.signal.aborted) { setResult(value); setLoading(false); } })
      .catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoading(false); } });
    return () => controller.abort();
  }, [request, input]);
  function load(value) { onBrowse(); setError(''); setResult(null); setLoading(true); setInput(value); }
  return <div className="google-sheet-picker">
    {selection ? <>
      <button disabled={disabled || loading} onClick={() => { setSelection(null); load({ query: search }); }}>← Spreadsheets</button>
      <h4>{selection.name}</h4><p>Choose a worksheet to preview.</p>
    </> : <form className="integration-tools" onSubmit={event => { event.preventDefault(); load({ query: search.trim() }); }}>
      <input aria-label="Search Google spreadsheets" placeholder="Search your spreadsheets…" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} />
      <button disabled={disabled || loading}>Search</button>
    </form>}
    {loading && <p role="status">Loading your {selection ? 'worksheets' : 'spreadsheets'}…</p>}
    {error && <p role="alert">{error} <button disabled={disabled} onClick={() => load({ ...input })}>Try again</button></p>}
    {!loading && result?.items?.length === 0 && <p>No {selection ? 'worksheets' : 'spreadsheets'} found{input.query ? ' matching your search' : ' in this account'}.</p>}
    {result?.items?.map(item => <button className="integration-picker-item" type="button" disabled={disabled || loading} key={item.id || item.name}
      onClick={() => selection ? onSelect(selection.id, item.name) : (setSelection(item), load({ spreadsheetId: item.id, tabs: true }))}>
      <span>{item.name}</span><span aria-hidden="true">→</span>
    </button>)}
    {result?.nextPageToken && <button disabled={disabled || loading} onClick={() => load({ query: input.query || '', pageToken: result.nextPageToken })}>Next spreadsheets</button>}
  </div>;
}
