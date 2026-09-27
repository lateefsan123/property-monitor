import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabase';
import { requestTemplateDraft } from '../../../../shared/template-draft';

export default function TemplateDraftControl({ disabled, onApply }) {
  const [brief, setBrief] = useState('');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(true), lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function generate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setDraft(null);
    try {
      const next = await requestTemplateDraft(supabase, brief.trim());
      if (active.current) setDraft(next);
    } catch (failure) { if (active.current) setError(failure.message); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <details className="template-ai-draft">
    <summary>Draft with AI</summary>
    <label className="message-template-body-field"><span>What should the message say?</span>
      <textarea value={brief} onChange={event => setBrief(event.target.value)} maxLength={600} rows={2}
        placeholder="A friendly monthly sales update with a gentle invitation to discuss selling." disabled={disabled || busy} />
    </label>
    <p className="muted">5 drafts a day. Review and edit before saving.</p>
    <button type="button" className="btn-sm" disabled={disabled || busy || brief.trim().length < 5} onClick={generate}>{busy ? 'Drafting…' : 'Generate draft'}</button>
    {error && <p role="alert">{error}</p>}
    {draft && <div className="template-ai-preview"><strong>{draft.name}</strong><p>{draft.content}</p>
      <button type="button" className="btn-sm" disabled={disabled || busy} onClick={() => { onApply(draft); setDraft(null); }}>Use draft in editor</button>
    </div>}
  </details>;
}
