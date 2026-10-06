import { useState } from "react";
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

function ColorPicker({ value, onChange, disabled }) {
  return (
    <div className="stx-colors" role="radiogroup" aria-label="Colour">
      {STATUS_COLOR_OPTIONS.map((color) => (
        <button key={color} type="button" role="radio" aria-checked={value === color} aria-label={color} disabled={disabled}
          className={`stx-swatch${value === color ? " is-active" : ""}`} style={{ "--swatch": color }} onClick={() => onChange(color)} />
      ))}
    </div>
  );
}

// Inline row for a new status or renaming one: name, colour, Cancel / Save.
function EditRow({ draft, setDraft, saving, onCancel, onSave, onDelete, isNew }) {
  return (
    <form className="stx-edit" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="stx-edit-main">
        <span className="stx-edit-dot" style={{ "--pill": draft.color }} aria-hidden="true" />
        <input className="stx-input" value={draft.label} maxLength={40} autoFocus placeholder="Status name, e.g. Hot lead"
          aria-label="Status name" disabled={saving} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        {isNew && <FollowUpSelect value={draft.follow_up_days} label="Follow up" disabled={saving} onChange={(days) => setDraft({ ...draft, follow_up_days: days })} />}
      </div>
      <div className="stx-edit-foot">
        <ColorPicker value={draft.color} disabled={saving} onChange={(color) => setDraft({ ...draft, color })} />
        <div className="stx-edit-actions">
          {onDelete && <button type="button" className="stx-icon-btn" onClick={onDelete} disabled={saving} aria-label="Delete status" title="Delete status"><IconTrash size={16} stroke={1.8} aria-hidden="true" /></button>}
          <button type="button" className="stx-btn" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="stx-btn stx-btn-primary" disabled={saving || !draft.label.trim()}>{saving ? "Saving…" : isNew ? "Create" : "Save"}</button>
        </div>
      </div>
    </form>
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
      <p className="stx-intro">Statuses show where each seller stands. The follow-up gap decides when a seller shows as due, and statuses set to "Don't follow up" are never sent automated messages.</p>

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
        {!statuses.isPending && !custom.length && editing !== "new" && (
          <button type="button" className="stx-empty" onClick={startNew}>Add your own, like "Hot lead" or "Viewing booked"</button>
        )}
        {custom.map((row) => editing === row.id ? (
          <EditRow key={row.id} draft={draft} setDraft={setDraft} saving={saving} onSave={saveDraft} onDelete={remove}
            onCancel={() => { setEditing(null); setDraft(null); }} />
        ) : (
          <div key={row.id} className="stx-row" role="row">
            <span role="cell"><StatusPill label={row.label} color={row.color || "#6b7280"} title="Rename or change colour"
              onClick={() => { setError(null); setEditing(row.id); setDraft({ ...row }); }} /></span>
            <span role="cell"><FollowUpSelect value={row.follow_up_days} label={`Follow up for ${row.label}`} disabled={busy} onChange={(days) => setFollowUp(row, days)} /></span>
            <span role="cell" className="stx-num">{count(`custom:${row.id}`)}</span>
          </div>
        ))}
        {editing === "new" && draft && (
          <EditRow draft={draft} setDraft={setDraft} saving={saving} onSave={saveDraft} isNew onCancel={() => { setEditing(null); setDraft(null); }} />
        )}

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

      {(error || statuses.error) && <p className="st-error" role="alert">{error || statuses.error.message}</p>}
    </div>
  );
}
