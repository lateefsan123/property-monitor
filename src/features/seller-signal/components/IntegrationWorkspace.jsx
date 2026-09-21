import { useRef, useState } from 'react';

export default function IntegrationWorkspace({ provider, feature, connection, request, upgrade }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [fileId, setFileId] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [preview, setPreview] = useState(null);
  async function run(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (error) { setError(error.message); }
    finally { lock.current = false; setBusy(false); }
  }
  function read(input = {}) {
    run(async () => { const result = await request({ action: 'read', provider, feature, input }); setData(result); setQuery(''); });
  }
  function edit(key, value) { setDraft(current => ({ ...current, [key]: value })); setPreview(null); }
  const upgradeNeeded = feature === 'email' ? !connection.canSend : provider === 'microsoft' && !connection.canReadWorkbook;
  return <section className="integration-workspace" aria-label={`${provider} ${feature} workspace`}>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {upgradeNeeded && <div className="integration-upgrade">
      <p>{feature === 'email' ? 'Sending needs an extra permission. Every email still requires your confirmation.' : 'Microsoft requires read/write file permission to read workbook cells. Repeat AI will only read your spreadsheet.'}</p>
      <button disabled={busy} onClick={() => upgrade(feature === 'email' ? 'send' : 'workbook')}>{feature === 'email' ? 'Enable sending' : 'Enable workbook reading'}</button>
    </div>}
    {feature === 'email' && <>
      <div className="integration-tools"><button disabled={busy} onClick={() => read()}>Load inbox</button>
        <button disabled={busy || !connection.canSend} onClick={() => { setDraft({ to: '', subject: '', body: '' }); setPreview(null); }}>New email</button></div>
      {data?.items?.map(item => <article className="integration-message" key={item.id}>
        <strong>{item.subject || '(no subject)'}</strong><small>{item.from}</small><p>{item.snippet}</p>
        <button disabled={busy || !connection.canSend} onClick={() => { setDraft({ replyToId: item.id, body: '' }); setPreview(null); }}>Reply</button>
      </article>)}
      {draft && <form onSubmit={event => { event.preventDefault(); run(async () => { setPreview(await request({ action: 'prepare_email', provider, feature, input: draft })); }); }}>
        <h3>{draft.replyToId ? 'Write a reply' : 'New email'}</h3>
        {!draft.replyToId && <><label>To<input type="email" required maxLength={254} value={draft.to} disabled={busy} onChange={event => edit('to', event.target.value)} /></label>
          <label>Subject<input required maxLength={300} value={draft.subject} disabled={busy} onChange={event => edit('subject', event.target.value)} /></label></>}
        <label>Message<textarea required maxLength={6000} rows={6} value={draft.body} disabled={busy} onChange={event => edit('body', event.target.value)} /></label>
        <div className="integration-tools"><button disabled={busy} type="submit">Preview email</button><button disabled={busy} type="button" onClick={() => { setDraft(null); setPreview(null); }}>Cancel</button></div>
      </form>}
      {preview && <div className="integration-send-preview" role="group" aria-label="Confirm email">
        <h3>Review before sending</h3><p>Via {provider === 'google' ? 'Gmail' : 'Outlook'}</p>
        <p>To: {preview.preview.to}</p><strong>{preview.preview.subject}</strong><pre>{preview.preview.body}</pre>
        <button disabled={busy} onClick={() => run(async () => {
          const confirmation = preview.confirmation;
          setPreview(null); // Never offer an automatic retry of a consumed confirmation.
          await request({ action: 'confirm_email', provider, feature, confirmation });
          setDraft(null); setNotice('Accepted by your email provider. Delivery is not yet confirmed.');
        })}>Confirm and send</button>
      </div>}
    </>}
    {feature === 'sheets' && <>
      {provider === 'google' ? <form onSubmit={event => { event.preventDefault(); read({ spreadsheetId, ...(sheetName ? { sheetName } : {}) }); }}>
        <label>Spreadsheet ID<input required value={spreadsheetId} onChange={event => setSpreadsheetId(event.target.value)} /></label>
        <label>Sheet name (optional)<input value={sheetName} onChange={event => setSheetName(event.target.value)} /></label><button disabled={busy}>Read spreadsheet</button>
      </form> : <>
        <button disabled={busy} onClick={() => { setFileId(''); read(); }}>Browse OneDrive</button>
        {data?.kind === 'file-list' && data.items.map(item => <div className="integration-file" key={item.id}>
          <span>{item.name}</span><button disabled={busy || (!item.folder && (!item.spreadsheet || !connection.canReadWorkbook))} onClick={() => {
            if (item.folder) read({ folderId: item.id }); else { setFileId(item.id); read({ fileId: item.id }); }
          }}>{item.folder ? 'Open folder' : 'Read workbook'}</button>
        </div>)}
        {data?.kind === 'worksheet-list' && data.items.map(item => <button disabled={busy} key={item.name} onClick={() => read({ fileId, sheetName: item.name })}>{item.name}</button>)}
      </>}
      {data?.kind === 'sheet-preview' && <>
        <p>{data.range} · Preview limited to the first 100 rows and 26 columns.</p>
        <label>Search this preview<input value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="integration-sheet-scroll"><table aria-label="Spreadsheet preview"><tbody>{data.rows.map((row, index) =>
          (!query || row.some(cell => cell.toLowerCase().includes(query.toLowerCase()))) && <tr key={index}><th scope="row">{index + 1}</th>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>
      </>}
    </>}
    {data?.items?.length === 0 && <p>No items found.</p>}
    {data?.hasMore && <p>Showing the first 10 items. More items are available in your provider.</p>}
    {busy && <p role="status">Please wait…</p>}
  </section>;
}
