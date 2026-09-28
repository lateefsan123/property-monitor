import { useEffect, useRef, useState } from "react";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { supabase } from "../../../supabase";
import { requestTemplateDraft } from "../../../../shared/template-draft";

// AI help for a message template, opened from the sparkle button beside the
// Message field. "Polish" rewrites what the user typed; "Prompt" writes a new
// template from a short description. The server takes a 5–600 character
// brief, so polishing sends the message inside that brief.
const BRIEF_LIMIT = 600;
const POLISH_PREFIX = "Polish this template. Keep its meaning, tone and placeholders; tighten the wording:\n\n";
const PROMPT_IDEAS = [
  "A friendly monthly sales update",
  "Short and direct, ask if they’d sell",
  "Warm intro for a first message",
];

export default function TemplateAiDialog({ message, disabled, onClose, onApply }) {
  const [mode, setMode] = useState(message.trim() ? "polish" : "prompt");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const active = useRef(true);
  const lock = useRef(false);

  const polishBrief = `${POLISH_PREFIX}${message.trim()}`;
  const polishTooLong = polishBrief.length > BRIEF_LIMIT;
  const brief = mode === "polish" ? polishBrief : prompt.trim();
  const canRun = mode === "polish" ? message.trim().length >= 5 && !polishTooLong : prompt.trim().length >= 5;

  useEffect(() => {
    active.current = true;
    const dialog = dialogRef.current;
    (dialog?.querySelector(".template-ai-body textarea") || dialog?.querySelector(".template-ai-foot .is-primary:not(:disabled)") || dialog?.querySelector(".template-ai-tabs .is-active"))?.focus();
    // Handle Escape here so it closes this dialog, not the templates modal.
    function onKey(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (!lock.current) onClose();
    }
    dialog?.addEventListener("keydown", onKey);
    return () => { active.current = false; dialog?.removeEventListener("keydown", onKey); };
  }, [onClose]);

  async function run() {
    if (lock.current || !canRun) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setDraft(null);
    try {
      const next = await requestTemplateDraft(supabase, brief);
      if (active.current) setDraft(next);
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }

  function switchMode(next) {
    if (busy) return;
    setMode(next);
    setDraft(null);
    setError("");
  }

  return (
    <div className="template-ai-layer" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={dialogRef} className="template-ai-dialog" role="dialog" aria-modal="true" aria-labelledby="template-ai-title">
        <header className="template-ai-head">
          <span className="template-ai-mark" aria-hidden="true"><IconSparkles size={18} stroke={1.8} /></span>
          <h2 id="template-ai-title">Write with AI</h2>
          <button type="button" className="template-ai-close" disabled={busy} onClick={onClose} aria-label="Close AI writer">
            <IconX size={18} stroke={1.8} aria-hidden="true" />
          </button>
        </header>

        <div className="template-ai-tabs" role="tablist" aria-label="AI mode">
          {[["polish", "Polish my message"], ["prompt", "Write from a prompt"]].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} className={mode === id ? "is-active" : ""} disabled={busy} onClick={() => switchMode(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="template-ai-body">
          {draft ? (
            <div className="template-ai-result">
              <span className="template-ai-label">{mode === "polish" ? "Polished message" : draft.name}</span>
              <p>{draft.content}</p>
            </div>
          ) : mode === "polish" ? (
            message.trim() ? (
              <div className="template-ai-source">
                <span className="template-ai-label">Your message</span>
                <p>{message.trim()}</p>
                {polishTooLong && <small className="template-ai-warn">Too long to polish. Shorten it, or write a new one from a prompt.</small>}
              </div>
            ) : (
              <p className="template-ai-empty">Type a message first, then come back to polish it.</p>
            )
          ) : (
            <>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={BRIEF_LIMIT}
                rows={3}
                disabled={busy}
                placeholder="What should the message say?"
                aria-label="Describe the message"
              />
              <div className="template-ai-ideas">
                {PROMPT_IDEAS.map((idea) => (
                  <button key={idea} type="button" disabled={busy} onClick={() => setPrompt(idea)}>{idea}</button>
                ))}
              </div>
            </>
          )}
          {error && <p className="template-ai-error" role="alert">{error}</p>}
        </div>

        <footer className="template-ai-foot">
          <small>5 AI drafts a day · review before saving</small>
          {draft ? (
            <>
              <button type="button" className="template-ai-btn" disabled={busy || disabled} onClick={run}>{busy ? "Working…" : "Try again"}</button>
              <button type="button" className="template-ai-btn is-primary" disabled={busy || disabled} onClick={() => onApply(draft, mode)}>Use this</button>
            </>
          ) : (
            <button type="button" className="template-ai-btn is-primary" disabled={busy || disabled || !canRun} onClick={run}>
              <IconSparkles size={16} stroke={1.8} aria-hidden="true" />
              {busy ? "Working…" : mode === "polish" ? "Polish" : "Write it"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
