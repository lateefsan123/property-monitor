import { useRef, useState } from 'react';
import { IconClock } from '@tabler/icons-react';
import { followUpAfterDays } from '../../../../supabase/functions/_shared/seller-follow-up.js';
import SellerStatusPill from './SellerStatusPill';

const DAY_CHOICES = [1, 3, 7, 14, 30];

// Follow-up card in the seller drawer: current state in one row, and the
// scheduling controls open underneath it.
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
  const summary = lead.nextFollowUpOn ? `Scheduled for ${lead.nextFollowUpOn}` : lead.dueLabel || 'Never contacted';

  return (
    <section className="seller-followup">
      <div className="seller-followup-row">
        <span className="seller-field-label"><IconClock size={16} stroke={1.7} aria-hidden="true" />Follow-up</span>
        <SellerStatusPill tone={lead.isDue && !lead.nextFollowUpOn ? 'red' : 'green'}>{summary}</SellerStatusPill>
        <button type="button" className="seller-drawer-text-btn" disabled={busy} aria-expanded={open} onClick={() => setOpen(value => !value)}>
          {open ? 'Cancel' : 'Change'}
        </button>
      </div>
      {open && (
        <div className="seller-followup-panel">
          <div className="seller-edit-chips" role="radiogroup" aria-label="Follow up in">
            {DAY_CHOICES.map(day => (
              <button type="button" key={day} role="radio" aria-checked={days === String(day)} className={days === String(day) ? 'is-active' : ''} disabled={busy} onClick={() => setDays(String(day))}>
                {day} {day === 1 ? 'day' : 'days'}
              </button>
            ))}
          </div>
          <label className="seller-followup-custom">
            Or in
            <input aria-label="Days until follow-up" type="number" min="0" max="365" step="1" value={days} disabled={busy} onChange={event => setDays(event.target.value)} />
            days{nextDate && <span> · {nextDate}, Dubai time</span>}
          </label>
          <label className="seller-followup-check">
            <input type="checkbox" checked={contactedToday} disabled={busy} onChange={event => setContactedToday(event.target.checked)} />
            I contacted this seller today
          </label>
          <p className="seller-message-hint">Automatic transaction messages wait until this date. Sending hours and limits still apply.</p>
          <div className="seller-message-actions">
            <button type="button" className="seller-drawer-secondary is-strong" disabled={busy || !nextDate} onClick={() => save()}>{busy ? 'Saving…' : 'Save follow-up'}</button>
            {lead.nextFollowUpOn && <button type="button" className="seller-drawer-text-btn" disabled={busy} onClick={() => save(true)}>Use default schedule</button>}
          </div>
        </div>
      )}
      {error && <p className="seller-message-error" role="alert">{error}</p>}
    </section>
  );
}
