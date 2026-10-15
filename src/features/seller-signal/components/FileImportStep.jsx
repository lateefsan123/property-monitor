import { useRef, useState } from 'react';
import { IconCloudUpload } from '@tabler/icons-react';
import { readImportFile } from '../read-import-file.js';
import { userFacingError } from '../../../../shared/user-facing-errors.js';
import ImportReview from './ImportReview';

export default function FileImportStep({ onImportRows, onClose, submitting, onBusyChange }) {
  const [file, setFile] = useState(null);
  const [sheets, setSheets] = useState(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function read() {
    if (!file || lock.current) return;
    lock.current = true; setBusy(true); onBusyChange(true); setError('');
    try { setSheets(await readImportFile(file)); setSheetIndex(0); }
    catch (failure) { setError(userFacingError(failure, 'We couldn’t read this file. Export a fresh copy and try again.')); }
    finally { lock.current = false; setBusy(false); onBusyChange(false); }
  }
  if (sheets) return <>
    {sheets.length > 1 && <label className="si-field"><span>Worksheet</span><select aria-label="Worksheet" value={sheetIndex} disabled={submitting || busy}
      onChange={event => setSheetIndex(Number(event.target.value))}>{sheets.map((sheet, index) => <option key={sheet.name} value={index}>{sheet.name}</option>)}</select></label>}
    <ImportReview key={sheetIndex} rawRows={sheets[sheetIndex].rows} label={`${file.name} · ${sheets[sheetIndex].name}`} onBack={() => setSheets(null)}
      onBusyChange={value => { setBusy(value); onBusyChange(value); }} onImport={async options => {
        const suffix = sheets.length > 1 ? ` · ${sheets[sheetIndex].name}` : '';
        const ok = await onImportRows({ key: `${file.name}:${file.size}:${file.lastModified}:${sheets[sheetIndex].name}`, label: file.name.replace(/\.(xlsx|xls|csv)$/i, '') + suffix, ...options });
        if (ok) onClose();
      }} />
  </>;
  return <div className="si-step">
    <label className="si-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy && !submitting) { setFile(event.dataTransfer.files?.[0] || null); setError(''); } }}>
      <input type="file" accept=".xlsx,.xls,.csv" aria-label="Choose spreadsheet file" disabled={busy || submitting} onChange={event => { setFile(event.target.files?.[0] || null); setError(''); }} />
      <IconCloudUpload size={28} /><strong>{file?.name || 'Drop your spreadsheet here'}</strong><span>Excel or CSV, up to 10 MB. Choose your worksheet next.</span>
    </label>
    {error && <p className="si-error" role="alert">{error}</p>}
    <div className="si-footer"><button className="si-btn is-primary" disabled={!file || busy || submitting} onClick={read}>{busy ? 'Reading file…' : 'Review columns'}</button></div>
  </div>;
}
