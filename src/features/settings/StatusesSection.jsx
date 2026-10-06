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
import { fetchUserLeads } from "../seller-signal/services";
import { sellerLeadsQueryKey } from "../seller-signal/queryKeys";
import ColorPicker from "../../components/ColorPicker";

// Seller statuses, after TheyDo's Statuses settings (Mobbin 2bc809cc): a plain
// table of Status / Follow up / Sellers, small group labels with a "+", and
// each status as a coloured pill. New statuses are added in an inline row,
// as in Lightfield's stages (Mobbin ea3faaac).
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
          <h3 id="stx-dialog-title">{isNew ? "New status" : "Edit status"}</h3>
          <StatusPill label={draft.label.trim() || "Status name"} color={draft.color} />
        </div>
        <label className="stx-field">
          <span>Name</span>
          <input className="stx-input" value={draft.label} maxLength={40} autoFocus placeholder="e.g. Hot lead"
            disabled={saving} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        </label>
        <div className="stx-field">
          <span>Colour</span>
          <ColorPicker value={draft.color} swatches={STATUS_COLOR_OPTIONS} onChange={(color) => setDraft((current) => ({ ...current, color }))} />
        </div>
        <label className="stx-field">
          <span>Follow up</span>
          <FollowUpSelect value={draft.follow_up_days} label="Follow up" disabled={saving} onChange={(days) => setDraft({ ...draft, follow_up_days: days })} />
        </label>
        {otherStatuses.length ? (
          <label className="stx-field">
            <span>After a status follow-up is sent, move to</span>
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
          <button type="submit" className="stx-btn stx-btn-primary" disabled={saving || !draft.label.trim()}>{saving ? "Saving…" : isNew ? "Create status" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

export default function StatusesSection({ userId }) {
  const client = useQueryClient();
  const statuses = useQuery({ queryKey: statusesQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchStatuses(userId) });
  const leads = useQuery({ queryKey: sellerLeadsQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchUserLeads(userId), staleTime: 60 * 1000 });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const rows = statuses.data || [];
  const custom = rows.filter((row) => !row.builtin_key);
  const overrides = new Map(rows.filter((row) => row.builtin_key).map((row) => [row.builtin_key, row]));
  const counts = {};
  for (const lead of leads.data?.leads || []) {
    const id = lead.statusRule?.id;
    if (id) counts[id] = (counts[id] || 0) + 1;
  }
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
    return run(async () => {
      const previous = draft.id ? rows.find((row) => row.id === draft.id) : null;
      const saved = await saveStatus(userId, { ...draft, position: draft.position ?? custom.length });
      if (previous && previous.label !== saved.label) await renameSellers(userId, previous.label, saved.label);
    });
  }

  function setFollowUp(row, days) {
    return run(() => saveStatus(userId, { ...row, follow_up_days: days }));
  }

  function setBuiltInFollowUp(item, days) {
    const override = overrides.get(item.key);
    return run(() => saveStatus(userId, { id: override?.id, builtin_key: item.key, label: item.key, follow_up_days: days }));
  }

  function remove() {
    const row = rows.find((item) => item.id === draft?.id);
    if (!row || !window.confirm(`Delete "${row.label}"? Sellers with this status will have no status.`)) return;
    run(() => deleteStatus(userId, row));
  }

  const count = (id) => (leads.data ? counts[id] || 0 : "–");

  return (
    <div className="stx">
      <div className="stx-top">
        <p className="stx-intro">Statuses show where each seller stands. The follow-up gap decides when a seller shows as due, and statuses set to "Don't follow up" are never sent automated messages.</p>
        <button type="button" className="stx-btn stx-btn-primary stx-new" onClick={startNew} disabled={busy || custom.length >= MAX_STATUSES - BUILT_INS.length}>
          <IconPlus size={15} stroke={2.2} aria-hidden="true" />New status
        </button>
      </div>

      <div className="stx-table" role="table" aria-label="Statuses">
        <div className="stx-head" role="row">
          <span role="columnheader">Status</span>
          <span role="columnheader">Follow up</span>
          <span role="columnheader" className="stx-num">Sellers</span>
        </div>

        <div className="stx-group">
          <span>Your statuses</span>
          <button type="button" className="stx-add" onClick={startNew} disabled={busy || editing === "new" || custom.length >= MAX_STATUSES - BUILT_INS.length} aria-label="Add status" title="Add status">
            <IconPlus size={16} stroke={2} aria-hidden="true" />
          </button>
        </div>
        {!statuses.isPending && !custom.length && (
          <button type="button" className="stx-empty" onClick={startNew}>Add your own, like "Hot lead" or "Viewing booked"</button>
        )}
        {custom.map((row) => (
          <div key={row.id} className="stx-row" role="row">
            <span role="cell"><StatusPill label={row.label} color={row.color || "#6b7280"} title="Rename or change colour"
              onClick={() => { setError(null); setEditing(row.id); setDraft({ ...row }); }} /></span>
            <span role="cell"><FollowUpSelect value={row.follow_up_days} label={`Follow up for ${row.label}`} disabled={busy} onChange={(days) => setFollowUp(row, days)} /></span>
            <span role="cell" className="stx-num">{count(`custom:${row.id}`)}</span>
          </div>
        ))}

        <div className="stx-group"><span>Built-in</span></div>
        {BUILT_INS.map((item) => {
          const days = item.locked ? 0 : overrides.get(item.key)?.follow_up_days ?? item.days;
          return (
            <div key={item.key} className="stx-row" role="row">
              <span role="cell"><StatusPill label={item.label} color={item.color} /></span>
              <span role="cell">
                {item.locked
                  ? <span className="stx-muted">Never messaged</span>
                  : <FollowUpSelect value={days} label={`Follow up for ${item.label}`} disabled={busy} onChange={(next) => setBuiltInFollowUp(item, next)} />}
              </span>
              <span role="cell" className="stx-num">{count(item.key)}</span>
            </div>
          );
        })}
      </div>

      {!editing && (error || statuses.error) && <p className="st-error" role="alert">{error || statuses.error?.message}</p>}
      {editing && draft && (
        <StatusDialog draft={draft} setDraft={setDraft} saving={saving} error={error} isNew={editing === "new"}
          otherStatuses={custom.filter((row) => row.id !== draft.id)}
          onSave={saveDraft} onDelete={editing === "new" ? null : remove} onCancel={closeDialog} />
      )}
    </div>
  );
}
