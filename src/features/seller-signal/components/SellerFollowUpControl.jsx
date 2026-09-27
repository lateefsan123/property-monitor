import { useRef, useState } from 'react';
import { followUpAfterDays } from '../../../../supabase/functions/_shared/seller-follow-up.js';

export default function SellerFollowUpControl({ lead, onSave }) {
  const [days, setDays] = useState('7');
  const [contactedToday, setContactedToday] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  let nextDate = '';
  try { nextDate = followUpAfterDays(days); } catch { /* Invalid values disable saving. */ }
  async function save(clear = false) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await onSave(lead.id, { days, contactedToday, clear }); setOpen(false); setContactedToday(false); }
    catch (failure) { setError(failure.message); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="lead-detail-panel" style={{ marginTop: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h3 className="lead-detail-panel-title">Follow-up</h3><p>{lead.nextFollowUpOn ? `Scheduled for ${lead.nextFollowUpOn}` : lead.dueLabel}</p></div><button type="button" className="btn-sm" disabled={busy} onClick={() => setOpen(value => !value)}>{open ? 'Cancel' : 'Set follow-up'}</button></div>
    {open && <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>{[1, 3, 7, 14, 30].map(day => <button type="button" className="btn-sm" key={day} disabled={busy} aria-pressed={days === String(day)} onClick={() => setDays(String(day))}>{day}d</button>)}</div>
      <label>Follow up in <input aria-label="Days until follow-up" type="number" min="0" max="365" step="1" value={days} disabled={busy} onChange={event => setDays(event.target.value)} style={{ width: 80, margin: '0 8px', padding: 8 }} /> days</label>
      {nextDate && <span>Next follow-up: {nextDate} · Dubai time</span>}
      <label><input type="checkbox" checked={contactedToday} disabled={busy} onChange={event => setContactedToday(event.target.checked)} /> I contacted this seller today</label>
      <small>Automatic transaction messages will wait until this date. Existing sending hours and limits still apply.</small>
      <button type="button" className="btn-sm" disabled={busy || !nextDate} onClick={() => save()}>{busy ? 'Saving…' : 'Save follow-up'}</button>
      {lead.nextFollowUpOn && <button type="button" className="btn-sm" disabled={busy} onClick={() => save(true)}>Use default schedule</button>}
    </div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
