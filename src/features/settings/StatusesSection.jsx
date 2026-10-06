import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
import {
  FOLLOW_UP_OPTIONS,
  MAX_STATUSES,
  STATUS_COLOR_OPTIONS,
  statusesQueryKey,
} from "../../../shared/seller-statuses.js";
import { deleteStatus, fetchStatuses, renameSellers, saveStatus } from "../seller-signal/seller-status-services";
import { refreshAccountStatuses } from "../seller-signal/status-registry";

// Seller statuses, after Linear's "Project statuses" settings (Mobbin
// e494c7a9): one card, grey group headers with a "+", a row per status with
// its colour, name and follow-up gap, edited inline with Cancel and Save.
const BUILT_INS = [
  { key: "prospect", label: "Prospect", tone: "#3b82f6", days: 75 },
  { key: "market_appraisal", label: "Appraisal", tone: "#d97706", days: 25 },
  { key: "for_sale_available", label: "For Sale", tone: "#16a34a", days: 5 },
  { key: "not_interested", label: "Not Interested", tone: "#9ca3af", locked: true },
];

function followUpLabel(days) {
  const option = FOLLOW_UP_OPTIONS.find((item) => item.days === Number(days));
  if (option) return option.label;
  return Number(days) === 0 ? "Don't follow up" : `Every ${days} days`;
}

function FollowUpSelect({ value, onChange, disabled }) {
  const options = FOLLOW_UP_OPTIONS.some((item) => item.days === Number(value))
    ? FOLLOW_UP_OPTIONS
    : [...FOLLOW_UP_OPTIONS, { days: Number(value), label: followUpLabel(value) }].sort((a, b) => a.days - b.days);
  return (
    <select className="st-status-select" value={String(value)} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} aria-label="Follow up">
      {options.map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}
    </select>
  );
}

function StatusEditor({ draft, onChange, onCancel, onSave, onDelete, saving, builtIn }) {
  return (
    <form className="st-status-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      {!builtIn && (
        <>
          <input className="st-status-name" value={draft.label} maxLength={40} autoFocus placeholder="Status name, e.g. Hot lead"
            onChange={(event) => onChange({ ...draft, label: event.target.value })} aria-label="Status name" disabled={saving} />
          <div className="st-status-colors" role="radiogroup" aria-label="Colour">
            {STATUS_COLOR_OPTIONS.map((color) => (
              <button key={color} type="button" role="radio" aria-checked={draft.color === color} aria-label={color}
                className={`st-status-swatch${draft.color === color ? " is-active" : ""}`} style={{ "--swatch": color }}
                onClick={() => onChange({ ...draft, color })} disabled={saving} />
            ))}
          </div>
        </>
      )}
      <label className="st-status-field">
        <span>Follow up</span>
        <FollowUpSelect value={draft.follow_up_days} disabled={saving} onChange={(days) => onChange({ ...draft, follow_up_days: days })} />
      </label>
      <div className="st-status-actions">
        {onDelete && <button type="button" className="st-status-delete" onClick={onDelete} disabled={saving}>Delete</button>}
        <button type="button" className="st-status-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="st-status-save" disabled={saving || (!builtIn && !draft.label.trim())}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

export default function StatusesSection({ userId }) {
  const client = useQueryClient();
  const statuses = useQuery({ queryKey: statusesQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchStatuses(userId) });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const rows = statuses.data || [];
  const custom = rows.filter((row) => !row.builtin_key);
  const overrides = new Map(rows.filter((row) => row.builtin_key).map((row) => [row.builtin_key, row]));

  function open(key, nextDraft) {
    setError(null);
    setEditing(key);
    setDraft(nextDraft);
  }

  async function afterChange() {
    refreshAccountStatuses(userId);
    await Promise.all([
      client.invalidateQueries({ queryKey: statusesQueryKey(userId) }),
      client.invalidateQueries({ queryKey: ["seller-signal"] }),
    ]);
    setEditing(null);
    setDraft(null);
  }

  async function run(task) {
    setSaving(true);
    setError(null);
    try {
      await task();
      await afterChange();
    } catch (failure) {
      setError(failure?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function save() {
    return run(async () => {
      const previous = draft.id ? rows.find((row) => row.id === draft.id) : null;
      const saved = await saveStatus(userId, { ...draft, position: draft.position ?? custom.length });
      if (previous && !previous.builtin_key && previous.label !== saved.label) await renameSellers(userId, previous.label, saved.label);
    });
  }

  function remove() {
    const row = rows.find((item) => item.id === draft.id);
    if (!row || !window.confirm(`Delete "${row.label}"? Sellers with this status will have no status.`)) return undefined;
    return run(() => deleteStatus(userId, row));
  }

  const editor = (key, { builtIn = false, deletable = false } = {}) => editing === key && draft ? (
    <StatusEditor draft={draft} onChange={setDraft} onCancel={() => { setEditing(null); setDraft(null); }} onSave={save}
      onDelete={deletable ? remove : null} saving={saving} builtIn={builtIn} />
  ) : null;

  return (
    <div className="st-stack">
      <div className="st-statuses">
        <div className="st-status-group">
          <span>Your statuses</span>
          <button type="button" className="st-status-add" aria-label="Add status" disabled={custom.length >= MAX_STATUSES - BUILT_INS.length || saving}
            onClick={() => open("new", { label: "", color: STATUS_COLOR_OPTIONS[custom.length % STATUS_COLOR_OPTIONS.length], follow_up_days: 14 })}>
            <IconPlus size={16} stroke={2} aria-hidden="true" />
          </button>
        </div>
        {statuses.isPending && <p className="st-status-empty">Loading statuses…</p>}
        {!statuses.isPending && !custom.length && editing !== "new" && (
          <button type="button" className="st-status-empty st-status-empty-button" onClick={() => open("new", { label: "", color: STATUS_COLOR_OPTIONS[0], follow_up_days: 14 })}>
            Add your own, like "Hot lead" or "Viewing booked", and choose how often Repeat reminds you to follow up.
          </button>
        )}
        {custom.map((row) => editing === row.id ? <div key={row.id}>{editor(row.id, { deletable: true })}</div> : (
          <button key={row.id} type="button" className="st-status-row" onClick={() => open(row.id, { ...row })}>
            <span className="st-status-dot" style={{ "--dot": row.color || "#6b7280" }} aria-hidden="true" />
            <span className="st-status-text"><strong>{row.label}</strong><small>{followUpLabel(row.follow_up_days)}</small></span>
          </button>
        ))}
        {editor("new")}

        <div className="st-status-group"><span>Built-in</span></div>
        {BUILT_INS.map((item) => {
          const override = overrides.get(item.key);
          const days = item.locked ? 0 : override ? override.follow_up_days : item.days;
          if (editing === item.key) return <div key={item.key}>{editor(item.key, { builtIn: true })}</div>;
          return (
            <button key={item.key} type="button" className="st-status-row" disabled={item.locked}
              onClick={() => open(item.key, { id: override?.id, builtin_key: item.key, label: item.label, follow_up_days: days })}>
              <span className="st-status-dot" style={{ "--dot": item.tone }} aria-hidden="true" />
              <span className="st-status-text"><strong>{item.label}</strong><small>{item.locked ? "Never messaged" : followUpLabel(days)}</small></span>
            </button>
          );
        })}
      </div>
      {(error || statuses.error) && <p className="st-error" role="alert">{error || statuses.error.message}</p>}
      <p className="st-note">Follow-up gaps decide when a seller shows as due. Statuses set to "Don't follow up" are never sent automated messages.</p>
    </div>
  );
}
