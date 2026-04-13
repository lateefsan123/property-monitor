import { useEffect, useState, useRef } from "react";
import { formatBedsLabel, formatDate, formatPrice, formatPsf, formatRange } from "../formatters";
import { buildMessage, formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../lead-utils";
import { formatLeadBedroom, extractUnitFromBuilding, formatLeadUnit, WhatsAppIcon } from "./LeadCard";

const EDIT_STATUS_OPTIONS = [
  { value: "", label: "No status" },
  { value: "Not Interested", label: "Not Interested" },
  { value: "Prospect", label: "Prospect" },
  { value: "Appraisal", label: "Appraisal" },
  { value: "For Sale", label: "For Sale" },
];

function CloseIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MessagePreview({ value }) {
  return <div className="message-preview">{value}</div>;
}

function TransactionTable({ insight, lead }) {
  if (insight.recentTransactions?.length > 0) {
    return (
      <div className="tx-table-wrap">
        <p className="tx-table-title">Sales History in {insight.locationName || lead.building}</p>
        <table className="tx-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>LOCATION</th>
              <th>PRICE (AED)</th>
              <th>BEDS</th>
              <th>AREA (SQFT)</th>
            </tr>
          </thead>
          <tbody>
            {insight.recentTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="tx-date">{formatDate(transaction.date)}</td>
                <td>
                  <span className="tx-location">{transaction.locationLabel}</span>
                  {transaction.floor && <span className="tx-floor">Floor {transaction.floor}</span>}
                </td>
                <td className="tx-price">{formatPrice(transaction.price)}</td>
                <td>{formatBedsLabel(transaction.beds)}</td>
                <td>{transaction.area ? Math.round(transaction.area).toLocaleString("en-US") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="muted">No priced sales found in this period.</p>;
}

function getEditStatusOptions(currentStatus) {
  if (!currentStatus || EDIT_STATUS_OPTIONS.some((option) => option.value === currentStatus)) {
    return EDIT_STATUS_OPTIONS;
  }

  return [
    EDIT_STATUS_OPTIONS[0],
    { value: currentStatus, label: `${currentStatus} (Current)` },
    ...EDIT_STATUS_OPTIONS.slice(1),
  ];
}

function LeadEditForm({ draft, isDeleting, isSaving, onCancel, onChange, onDelete, onSave }) {
  const statusOptions = getEditStatusOptions(draft?.status);

  return (
    <form
      className="lead-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave?.();
      }}
    >
      <div className="lead-edit-grid">
        <label className="lead-edit-field">
          <span>Name</span>
          <input
            type="text"
            value={draft?.name || ""}
            onChange={(event) => onChange?.("name", event.target.value)}
            placeholder="Seller name"
          />
        </label>

        <label className="lead-edit-field">
          <span>Building</span>
          <input
            type="text"
            value={draft?.building || ""}
            onChange={(event) => onChange?.("building", event.target.value)}
            placeholder="Building name"
          />
        </label>

        <label className="lead-edit-field">
          <span>Phone</span>
          <input
            type="tel"
            value={draft?.phone || ""}
            onChange={(event) => onChange?.("phone", event.target.value)}
            placeholder="+971..."
          />
        </label>

        <label className="lead-edit-field">
          <span>Bedroom</span>
          <input
            type="text"
            value={draft?.bedroom || ""}
            onChange={(event) => onChange?.("bedroom", event.target.value)}
            placeholder="2BR"
          />
        </label>

        <label className="lead-edit-field">
          <span>Unit</span>
          <input
            type="text"
            value={draft?.unit || ""}
            onChange={(event) => onChange?.("unit", event.target.value)}
            placeholder="Unit 1203"
          />
        </label>

        <label className="lead-edit-field">
          <span>Status</span>
          <select value={draft?.status || ""} onChange={(event) => onChange?.("status", event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="lead-edit-field">
          <span>Last contact</span>
          <input
            type="date"
            value={draft?.lastContact || ""}
            onChange={(event) => onChange?.("lastContact", event.target.value)}
          />
        </label>
      </div>

      <div className="lead-edit-actions">
        <button type="submit" className="btn-sm btn-primary" disabled={isSaving || isDeleting}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="btn-sm" disabled={isSaving || isDeleting} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-sm btn-danger" disabled={isSaving || isDeleting} onClick={onDelete}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </form>
  );
}

export default function LeadModal({
  copiedLeadId,
  editDraft,
  insight,
  isDeleting,
  isEditing,
  isSaving,
  isSent,
  lead,
  onCancelEditing,
  onClose,
  onCopyMessage,
  onDelete,
  onEditFieldChange,
  onSaveEdit,
  onSaveNotes,
  onStartEditing,
  onToggleSent,
  onUpdateStatus,
}) {
  const [notesValue, setNotesValue] = useState(lead.notes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimerRef = useRef(null);

  function handleNotesChange(event) {
    const next = event.target.value;
    setNotesValue(next);
    // Auto-save after 1 second of no typing
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      setNotesSaving(true);
      Promise.resolve(onSaveNotes?.(lead.id, next)).finally(() => setNotesSaving(false));
    }, 1000);
  }

  function handleNotesBlur() {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    if (notesValue !== (lead.notes || "")) {
      setNotesSaving(true);
      Promise.resolve(onSaveNotes?.(lead.id, notesValue)).finally(() => setNotesSaving(false));
    }
  }

  const message = insight?.message || buildMessage(lead, insight);
  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);
  const displayBuildingLabel = insight?.locationName || formatBuildingLabel(lead.building) || lead.building || "-";
  const bedroomLabel = formatLeadBedroom(lead.bedroom);
  const unitLabel = formatLeadUnit(lead.unit || extractUnitFromBuilding(lead.building));
  const whatsappUrl = whatsappPhone
    ? `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(message)}`
    : null;

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div className="lead-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lead-modal-header">
          <div className="lead-modal-title-block">
            <h2 className="lead-modal-name">{lead.name || "Unnamed"}</h2>
            <span className="lead-modal-building">{displayBuildingLabel}</span>
            <div className="lead-modal-meta">
              {bedroomLabel && <span className="lead-modal-chip">{bedroomLabel}</span>}
              {unitLabel && <span className="lead-modal-chip">{unitLabel}</span>}
            </div>
          </div>
          <div className="lead-modal-header-actions">
            {!isEditing && (
              <button type="button" className="btn-sm" disabled={isSaving || isDeleting} onClick={() => onStartEditing?.(lead.id)}>
                Edit
              </button>
            )}
            <button type="button" className="lead-modal-close" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="lead-modal-body">
          {isEditing ? (
            <LeadEditForm
              draft={editDraft}
              isDeleting={isDeleting}
              isSaving={isSaving}
              onCancel={onCancelEditing}
              onChange={onEditFieldChange}
              onDelete={() => onDelete?.(lead.id)}
              onSave={() => onSaveEdit?.(lead.id)}
            />
          ) : (
            <>
              {/* Status & contact section */}
              <div className="lead-modal-section">
                <div className="lead-modal-detail-grid">
                  <div className="lead-modal-detail">
                    <span className="lead-modal-detail-label">Status</span>
                    <span className="lead-modal-detail-value">{lead.statusLabel || "-"}</span>
                  </div>
                  <div className="lead-modal-detail">
                    <span className="lead-modal-detail-label">Phone</span>
                    <span className="lead-modal-detail-value">{lead.phone || "-"}</span>
                  </div>
                  <div className="lead-modal-detail">
                    <span className="lead-modal-detail-label">Last contact</span>
                    <span className="lead-modal-detail-value">{formatDate(lead.lastContactDate)}</span>
                  </div>
                  <div className="lead-modal-detail">
                    <span className="lead-modal-detail-label">Follow-up</span>
                    <span className={`lead-modal-detail-value ${lead.isDue ? "lead-modal-detail-due" : ""}`}>{lead.dueLabel}</span>
                  </div>
                </div>
              </div>

              {/* Market data section */}
              {insight?.status === "ready" && (
                <div className="lead-modal-section">
                  <div className="lead-modal-section-header">Market Data</div>
                  <div className="bayut-row">
                    <div className="bayut-stat">
                      <span className="bayut-stat-value">{insight.count}</span>
                      <span className="bayut-stat-label">Transactions</span>
                    </div>
                    <div className="bayut-stat">
                      <span className="bayut-stat-value">{formatPrice(insight.avg)}</span>
                      <span className="bayut-stat-label">Avg Price</span>
                    </div>
                    <div className="bayut-stat">
                      <span className="bayut-stat-value">{formatPsf(insight.psf)}</span>
                      <span className="bayut-stat-label">Per Sqft</span>
                    </div>
                    <div className="bayut-stat">
                      <span className="bayut-stat-value">{formatRange(insight.min, insight.max)}</span>
                      <span className="bayut-stat-label">Range</span>
                    </div>
                  </div>
                  <TransactionTable insight={insight} lead={lead} />
                </div>
              )}

              {insight?.status === "loading" && <p className="muted">Loading market data...</p>}
              {insight?.status === "error" && <p className="error-sm">{insight.error}</p>}

              {/* Message section */}
              <div className="lead-modal-section">
                <div className="lead-modal-section-header">Message</div>
                <MessagePreview value={message} />
              </div>

              {/* Notes */}
              <div className="lead-modal-notes">
                <div className="lead-modal-notes-header">
                  <span className="lead-modal-notes-label">Notes</span>
                  {notesSaving ? <span className="lead-modal-notes-status">Saving...</span> : null}
                </div>
                <textarea
                  className="lead-modal-notes-input"
                  value={notesValue}
                  onChange={handleNotesChange}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes about this lead..."
                  rows={3}
                />
              </div>

            </>
          )}
        </div>

        {/* Fixed WhatsApp button */}
        {!isEditing && (
          <div className="lead-modal-wa-fixed">
            {whatsappUrl ? (
              <a
                className="lead-modal-wa-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (!isSent) void onToggleSent(lead.id); }}
              >
                <WhatsAppIcon />
                {isSent ? "Sent" : "Send via WhatsApp"}
              </a>
            ) : (
              <button
                type="button"
                className="lead-modal-wa-btn lead-modal-wa-nophone"
                onClick={() => {
                  void onCopyMessage(lead.id, message);
                  if (!isSent) void onToggleSent(lead.id);
                }}
              >
                <WhatsAppIcon />
                {isSent ? "Sent" : copiedLeadId === lead.id ? "Copied!" : "Copy message"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
