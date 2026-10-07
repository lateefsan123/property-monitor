import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import {
  FOLLOW_UP_OPTIONS,
  MAX_STATUSES,
  STATUS_COLOR_OPTIONS,
  statusesQueryKey,
} from "../../../shared/seller-statuses.js";
import { deleteStatus, fetchStatuses, renameSellers, saveStatus } from "../seller-signal/seller-status-services";
import { refreshAccountStatuses } from "../seller-signal/status-registry";
import ColorPicker from "../../components/ColorPicker";
import { SettingsGroup, SettingsItem } from "./settings-ui";

// Seller statuses, laid out like the other Settings pages (settings-ui.jsx):
// titled groups of rows showing each status as a coloured pill and its
// follow-up gap. A row (or "New status") opens the status dialog.
const BUILT_INS = [
  { key: "prospect", label: "Prospect", color: "#3b82f6", days: 75 },
  { key: "market_appraisal", label: "Appraisal", color: "#d97706", days: 25 },
  { key: "for_sale_available", label: "For Sale", color: "#16a34a", days: 5 },
  { key: "not_interested", label: "Not Interested", color: "#6b7280", locked: true },
];

function followUpLabel(days) {
  return FOLLOW_UP_OPTIONS.find((item) => item.days === Number(days))?.label || (Number(days) === 0 ? "Don't follow up" : `Every ${days} days`);
}

function StatusPill({ label, color, onClick, title }) {
  const content = <><span className="stx-pill-dot" aria-hidden="true" />{label}</>;
  return onClick
    ? <button type="button" className="stx-pill" style={{ "--pill": color }} onClick={onClick} title={title}>{content}</button>
    : <span className="stx-pill" style={{ "--pill": color }}>{content}</span>;
}

function FollowUpSelect({ value, onChange, disabled, label }) {
  const options = FOLLOW_UP_OPTIONS.some((item) => item.days === Number(value))
    ? FOLLOW_UP_OPTIONS
    : [...FOLLOW_UP_OPTIONS, { days: Number(value), label: followUpLabel(value) }].sort((a, b) => a.days - b.days);
  return (
    <select className="stx-select" value={String(value)} disabled={disabled} aria-label={label} onChange={(event) => onChange(Number(event.target.value))}>
      {options.map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}
    </select>
  );
}

// Add or edit a status in a dialog, after Attio's status editor (Mobbin
// 32cedf09): name, a live preview pill, the colour picker and the follow-up
// gap, with Cancel and Create/Save. Escape or the backdrop closes it.
function StatusDialog({ draft, setDraft, saving, error, onCancel, onSave, onDelete, isNew, otherStatuses = [] }) {
  const builtIn = Boolean(draft.builtin_key);
  useEffect(() => {
    const escape = (event) => { if (event.key === "Escape" && !saving) onCancel(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onCancel, saving]);
  return (
    <div className="stx-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
      <form className="stx-dialog" role="dialog" aria-modal="true" aria-labelledby="stx-dialog-title"
        onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <div className="stx-dialog-head">
          <h3 id="stx-dialog-title">{builtIn ? draft.label : isNew ? "New status" : "Edit status"}</h3>
          <StatusPill label={draft.label.trim() || "Status name"} color={draft.color} />
        </div>
        {!builtIn && <label className="stx-field">
          <span>Name</span>
          <input className="stx-input" value={draft.label} maxLength={40} autoFocus placeholder="e.g. Hot lead"
            disabled={saving} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        </label>}
        {!builtIn && <div className="stx-field">
          <span>Colour</span>
          <ColorPicker value={draft.color} swatches={STATUS_COLOR_OPTIONS} onChange={(color) => setDraft((current) => ({ ...current, color }))} />
        </div>}
        {!draft.locked && <label className="stx-field">
          <span>Follow up</span>
          <FollowUpSelect value={draft.follow_up_days} label="Follow up" disabled={saving} onChange={(days) => setDraft({ ...draft, follow_up_days: days })} />
        </label>}
        {builtIn && (
          <label className="stx-switch-row">
            <span>Show in status lists</span>
            <input type="checkbox" role="switch" className="st-switch" checked={!draft.hidden} disabled={saving}
              onChange={(event) => setDraft({ ...draft, hidden: !event.target.checked })} />
          </label>
        )}
        {!builtIn && otherStatuses.length ? (
          <label className="stx-field">
            <span>Then move to</span>
            <select className="stx-select" value={draft.next_status_id || ""} disabled={saving}
              onChange={(event) => setDraft({ ...draft, next_status_id: event.target.value || null })}>
              <option value="">Stay in this status</option>
              {otherStatuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
          </label>
        ) : null}
        {error && <p className="st-error" role="alert">{error}</p>}
        <div className="stx-dialog-actions">
          {onDelete && <button type="button" className="stx-btn stx-btn-danger" onClick={onDelete} disabled={saving}><IconTrash size={15} stroke={1.8} aria-hidden="true" />Delete</button>}
          <button type="button" className="stx-btn" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="stx-btn stx-btn-primary" disabled={saving || (!builtIn && !draft.label.trim())}>{saving ? "Saving…" : isNew ? "Create status" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

export default function StatusesSection({ userId, newStatusRequest = 0 }) {
  const client = useQueryClient();
  const statuses = useQuery({ queryKey: statusesQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchStatuses(userId) });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const rows = statuses.data || [];
  const custom = rows.filter((row) => !row.builtin_key);
  const overrides = new Map(rows.filter((row) => row.builtin_key).map((row) => [row.builtin_key, row]));
  const busy = saving || statuses.isPending;

  async function run(task) {
    setSaving(true);
    setError(null);
    try {
      await task();
      refreshAccountStatuses(userId);
      await Promise.all([
        client.invalidateQueries({ queryKey: statusesQueryKey(userId) }),
        client.invalidateQueries({ queryKey: ["seller-signal"] }),
      ]);
      setEditing(null);
      setDraft(null);
    } catch (failure) {
      setError(failure?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const closeDialog = useCallback(() => { setEditing(null); setDraft(null); setError(null); }, []);

  function startNew() {
    setError(null);
    setEditing("new");
    setDraft({ label: "", color: STATUS_COLOR_OPTIONS[custom.length % STATUS_COLOR_OPTIONS.length], follow_up_days: 14 });
  }

  function saveDraft() {
    if (draft.builtin_key) return run(() => saveStatus(userId, { id: draft.id, builtin_key: draft.builtin_key, label: draft.builtin_key, follow_up_days: draft.follow_up_days, hidden: draft.hidden }));
    return run(async () => {
      const previous = draft.id ? rows.find((row) => row.id === draft.id) : null;
      const saved = await saveStatus(userId, { ...draft, position: draft.position ?? custom.length });
      if (previous && previous.label !== saved.label) await renameSellers(userId, previous.label, saved.label);
    });
  }

  function remove() {
    const row = rows.find((item) => item.id === draft?.id);
    if (!row || !window.confirm(`Delete "${row.label}"? Sellers with this status will have no status.`)) return;
    run(() => deleteStatus(userId, row));
  }


  // The page header's "New status" button bumps newStatusRequest.
  const [handledRequest, setHandledRequest] = useState(newStatusRequest);
  if (newStatusRequest !== handledRequest) {
    setHandledRequest(newStatusRequest);
    if (!busy && custom.length < MAX_STATUSES - BUILT_INS.length) {
      setError(null);
      setEditing("new");
      setDraft({ label: "", color: STATUS_COLOR_OPTIONS[custom.length % STATUS_COLOR_OPTIONS.length], follow_up_days: 14 });
    }
  }

  const open = (key, nextDraft) => { setError(null); setEditing(key); setDraft(nextDraft); };
  const atLimit = custom.length >= MAX_STATUSES - BUILT_INS.length;

  return (
    <div className="st-stack">
      <SettingsGroup title="Your statuses">
        {custom.map((row) => (
          <SettingsItem key={row.id} label={<StatusPill label={row.label} color={row.color || "#6b7280"} />}
            value={followUpLabel(row.follow_up_days)} disabled={busy} onClick={() => open(row.id, { ...row })} />
        ))}
        {!custom.length && <SettingsItem icon={IconPlus} label="New status" disabled={busy || atLimit} onClick={startNew} />}
      </SettingsGroup>

      <SettingsGroup title="Built-in">
        {BUILT_INS.map((item) => {
          const override = overrides.get(item.key);
          const days = item.locked ? 0 : override?.follow_up_days ?? item.days;
          return (
            <SettingsItem key={item.key} label={<StatusPill label={item.label} color={item.color} />}
              value={override?.hidden ? "Hidden" : item.locked ? "Never messaged" : followUpLabel(days)}
              disabled={busy}
              onClick={() => open(item.key, { id: override?.id, builtin_key: item.key, label: item.label, follow_up_days: days, hidden: Boolean(override?.hidden), locked: item.locked, color: item.color })} />
          );
        })}
      </SettingsGroup>

      {!editing && (error || statuses.error) && <p className="st-error" role="alert">{error || statuses.error?.message}</p>}
      {editing && draft && (
        <StatusDialog draft={draft} setDraft={setDraft} saving={saving} error={error} isNew={editing === "new"}
          otherStatuses={custom.filter((row) => row.id !== draft.id)}
          onSave={saveDraft} onDelete={editing === "new" || draft.builtin_key ? null : remove} onCancel={closeDialog} />
      )}
    </div>
  );
}
