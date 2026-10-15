import { useMemo, useRef, useState } from 'react';
import { IMPORT_FIELDS, importPreviewStats, prepareImportRows, validateImportMapping } from '../import-preview.js';
import { userFacingError, UserFacingError } from '../../../../shared/user-facing-errors.js';
import { downloadRejectedRows } from '../import-rejected-rows.js';

export default function ImportReview({ rawRows, label, onImport, onBack, onBusyChange }) {
  const [headerRowIndex, setHeaderRowIndex] = useState(() => prepareImportRows(rawRows).headerRowIndex);
  const preview = useMemo(() => prepareImportRows(rawRows, { headerRowIndex }), [rawRows, headerRowIndex]);
  const [chosen, setChosen] = useState(null);
  const mapping = chosen || preview.mapping;
  const stats = useMemo(() => importPreviewStats(preview.records, mapping), [preview.records, mapping]);
  const ignored = preview.headers.filter(header => !Object.values(mapping).includes(header));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);
  const [rejectedRows, setRejectedRows] = useState([]);
  const lock = useRef(false);
  let validation = '';
  try { validateImportMapping(preview.headers, mapping); }
  catch (failure) { validation = userFacingError(failure); }

  async function save(event) {
    event.preventDefault();
    if (lock.current || validation || !stats.identifiable) return;
    lock.current = true;
    setBusy(true); setError(''); setProgress(null); setRejectedRows([]); onBusyChange?.(true);
    try { await onImport({ rawRows, mapping, headerRowIndex, onProgress: setProgress }); }
    catch (failure) {
      setError(userFacingError(failure, 'We couldn’t finish this import. Please retry the same sheet to continue.'));
      if (failure instanceof UserFacingError && Array.isArray(failure.failedRows)) setRejectedRows(failure.failedRows);
    }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }

  return <form className="si-step" onSubmit={save}>
    <div className="si-buildings-head"><strong>Review your import</strong><span>{label}</span></div>
    <p className="si-hint">{stats.total.toLocaleString()} rows found. Check the columns and sample before saving.</p>
    <label className="si-field"><span>Column headings are on row</span>
      <input aria-label="Header row" type="number" min="1" max={rawRows.length - 1} value={headerRowIndex + 1} disabled={busy}
        onChange={event => { const index = Number(event.target.value) - 1; if (Number.isInteger(index) && index >= 0 && index < rawRows.length - 1) { setHeaderRowIndex(index); setChosen(null); setError(''); } }} />
    </label>
    <div className="si-mapping">
      {IMPORT_FIELDS.map(([key, title]) => <label className="si-field" key={key}><span>{title}</span>
        <select aria-label={title} value={mapping[key] || ''} disabled={busy} onChange={event => setChosen({ ...mapping, [key]: event.target.value || null })}>
          <option value="">Don’t import</option>
          {preview.headers.map(header => <option key={header} value={header}>{header}</option>)}
        </select>
      </label>)}
    </div>
    {mapping.lastContact && <p className="si-hint">Dates use day/month/year or year-month-day. For example, 03/04/2026 means 3 April.</p>}
    {ignored.length > 0 && <details className="si-hint"><summary>{ignored.length} column{ignored.length === 1 ? "" : "s"} won’t be imported</summary><p>{ignored.join(', ')}</p></details>}
    <div className="si-sample" tabIndex="0" aria-label="Import sample">
      <table><caption>First 3 seller rows</caption><thead><tr>{IMPORT_FIELDS.filter(([key]) => mapping[key]).map(([key, title]) => <th key={key}>{title}</th>)}</tr></thead>
        <tbody>{preview.records.slice(0, 3).map(row => <tr key={row.__row}>{IMPORT_FIELDS.filter(([key]) => mapping[key]).map(([key]) => <td key={key}>{row[mapping[key]] || '—'}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p className="si-hint">{stats.withoutPhone.toLocaleString()} rows have no phone number; {stats.withoutBuilding.toLocaleString()} have no building. {stats.total - stats.identifiable > 0 ? `${(stats.total - stats.identifiable).toLocaleString()} rows can’t be identified and will be skipped.` : ''} Existing sellers keep their saved status and contact history.</p>
    {validation && <p className="si-error" role="alert">{validation}</p>}
    {error && <p className="si-error" role="alert">{error}</p>}
    {rejectedRows.length > 0 && <button type="button" className="si-btn" onClick={() => downloadRejectedRows(rejectedRows)}>Download rows to check</button>}
    {busy && <div role="status" aria-live="polite"><p>{progress ? `${progress.saved.toLocaleString()} of ${progress.total.toLocaleString()} sellers saved${progress.failed ? `; ${progress.failed} need attention` : ''}.` : 'Checking existing sellers…'} Keep this tab open.</p>
      {progress && <progress max={progress.total || 1} value={progress.saved + progress.failed} />}</div>}
    <div className="si-footer"><button type="button" className="si-btn" onClick={onBack} disabled={busy}>Back</button>
      <button type="submit" className="si-btn is-primary" disabled={busy || Boolean(validation) || !stats.identifiable}>{busy ? 'Importing…' : 'Import sellers'}</button></div>
  </form>;
}
