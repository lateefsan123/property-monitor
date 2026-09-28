import { useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconBed,
  IconBuildingEstate,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconCircleDot,
  IconClock,
  IconCopy,
  IconDoor,
  IconPhone,
  IconPhoto,
} from "@tabler/icons-react";
import { formatBedsLabel, formatDate, formatPrice, formatPsf, formatRange } from "../formatters";
import SellerStatusPill from "./SellerStatusPill";
import { sellerStatusTone } from "./seller-avatar";

// Same choices as the mobile seller sheet.
const STATUS_ACTIONS = [
  { id: "prospect", label: "Prospect", value: "Prospect" },
  { id: "market_appraisal", label: "Appraisal", value: "Appraisal" },
  { id: "for_sale_available", label: "For Sale", value: "For Sale" },
];

const EDIT_STATUS_OPTIONS = [
  { value: "", label: "No status" },
  { value: "Not Interested", label: "Not Interested" },
  { value: "Prospect", label: "Prospect" },
  { value: "Appraisal", label: "Appraisal" },
  { value: "For Sale", label: "For Sale" },
];

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

// Edit form in the drawer body; Save and Cancel live in the drawer footer and
// submit this form through its id.
export const SELLER_EDIT_FORM_ID = "seller-edit-form";

function EditField({ label, children }) {
  return (
    <label className="seller-edit-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function LeadEditForm({ draft, isDeleting, isSaving, onChange, onDelete, onSave }) {
  const statusOptions = getEditStatusOptions(draft?.status);
  const busy = isSaving || isDeleting;
  const input = (field, props) => (
    <input value={draft?.[field] || ""} disabled={busy} onChange={(event) => onChange?.(field, event.target.value)} {...props} />
  );

  return (
    <form
      id={SELLER_EDIT_FORM_ID}
      className="seller-edit"
      onSubmit={(event) => {
        event.preventDefault();
        onSave?.();
      }}
    >
      <EditField label="Name">{input("name", { type: "text", placeholder: "Seller name" })}</EditField>
      <EditField label="Phone">{input("phone", { type: "tel", placeholder: "+971..." })}</EditField>
      <EditField label="Building">{input("building", { type: "text", placeholder: "Building name" })}</EditField>
      <div className="seller-edit-row">
        <EditField label="Unit">{input("unit", { type: "text", placeholder: "1203" })}</EditField>
        <EditField label="Bedrooms">{input("bedroom", { type: "text", placeholder: "2BR" })}</EditField>
      </div>
      <div className="seller-edit-field">
        <span>Status</span>
        <div className="seller-edit-chips" role="radiogroup" aria-label="Status">
          {statusOptions.map((option) => {
            const active = (draft?.status || "") === option.value;
            return (
              <button
                key={option.value || "blank"}
                type="button"
                role="radio"
                aria-checked={active}
                className={active ? "is-active" : ""}
                disabled={busy}
                onClick={() => onChange?.("status", option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <EditField label="Last contact">{input("lastContact", { type: "date" })}</EditField>

      <div className="seller-edit-danger">
        <div>
          <strong>Delete seller</strong>
          <span>Removes this seller and their notes. This cannot be undone.</span>
        </div>
        <button type="button" className="seller-drawer-secondary is-danger" disabled={busy} onClick={onDelete}>
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </form>
  );
}

// Lightfield-style field list for the seller drawer: icon, label, value,
// grouped in one rounded card like the mobile sheet's info group.
export function SellerDetailsPanel({ lead, buildingLabel, bedroomLabel, unitLabel, disabled, onUpdateStatus }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const statusRef = useRef(null);
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => {
    if (!statusOpen) return undefined;
    const onDown = (event) => { if (!statusRef.current?.contains(event.target)) setStatusOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [statusOpen]);

  async function copyPhone() {
    clearTimeout(copyTimer.current);
    try { await navigator.clipboard.writeText(String(lead.phone)); setCopied(true); } catch { setCopied(false); }
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const issues = (lead.dataQuality?.issues || []).filter((issue) => issue.id !== "legacy_source");
  const unitValue = unitLabel?.replace(/^Unit\s+/i, "");
  const bedroomValue = bedroomLabel && bedroomLabel !== "N/A" ? bedroomLabel : "";
  const empty = (text) => <span className="seller-field-empty">{text}</span>;

  const fields = [
    {
      icon: IconPhone,
      label: "Phone",
      value: lead.phone ? (
        <button type="button" className="seller-field-copy" onClick={copyPhone} aria-label={`Copy phone number ${lead.phone}`}>
          <span>{lead.phone}</span>
          {copied ? <IconCheck size={14} stroke={1.8} aria-hidden="true" /> : <IconCopy size={14} stroke={1.8} aria-hidden="true" />}
          <span className="seller-field-copy-status" role="status">{copied ? "Copied" : ""}</span>
        </button>
      ) : empty("No phone number"),
    },
    { icon: IconBuildingEstate, label: "Building", value: buildingLabel },
    { icon: IconDoor, label: "Unit", value: unitValue || empty("No unit") },
    { icon: IconBed, label: "Bedrooms", value: bedroomValue || empty("Not set") },
    {
      icon: IconCircleDot,
      label: "Status",
      value: (
        <div className="seller-field-status" ref={statusRef}>
          <button
            type="button"
            className="seller-field-status-btn"
            disabled={disabled || !onUpdateStatus}
            aria-haspopup="menu"
            aria-expanded={statusOpen}
            aria-label={`Change status, currently ${lead.statusLabel || "Unknown"}`}
            onClick={() => setStatusOpen((value) => !value)}
          >
            <SellerStatusPill tone={sellerStatusTone(lead.statusRule?.id)}>{lead.statusLabel || "Unknown"}</SellerStatusPill>
            {onUpdateStatus && <IconChevronDown size={15} stroke={1.8} aria-hidden="true" />}
          </button>
          {statusOpen && (
            <div className="seller-pill-menu" role="menu">
              {STATUS_ACTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={lead.statusRule?.id === option.id}
                  className={`seller-pill-option${lead.statusRule?.id === option.id ? " is-selected" : ""}`}
                  onClick={() => { setStatusOpen(false); if (lead.statusRule?.id !== option.id) onUpdateStatus(lead.id, option.value); }}
                >
                  <span>{option.label}</span>
                  {lead.statusRule?.id === option.id && <IconCheck size={15} stroke={2} aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
    { icon: IconCalendar, label: "Last contact", value: lead.lastContactDate ? formatDate(lead.lastContactDate) : empty("Not contacted yet") },
  ];

  return (
    <div className="seller-fields-wrap">
      <div className="seller-fields">
        {fields.map((field) => (
          <div className="seller-field" key={field.label}>
            <span className="seller-field-label"><field.icon size={16} stroke={1.7} aria-hidden="true" />{field.label}</span>
            <span className="seller-field-value">{field.value}</span>
          </div>
        ))}
      </div>
      {issues.length > 0 && (
        <p className="seller-field-notice" role="status">
          <IconAlertTriangle size={15} stroke={1.8} aria-hidden="true" />
          {issues.map((issue) => issue.label).join(" · ")}
        </p>
      )}
    </div>
  );
}

export function DataQualityPanel({ lead }) {
  const match = lead.buildingMatch;
  const quality = lead.dataQuality;
  const issues = quality?.issues || [];
  const matchLabel = match?.status === "matched"
    ? `${match.canonicalName} (${match.confidence} confidence)`
    : match?.status === "missing"
      ? "No building supplied"
      : match?.status === "unmatched"
        ? "Awaiting a verified match from Repeat AI"
        : `Invalid building: ${match?.inputName || "Unknown"}`;

  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Data quality</h3>
        <p className="lead-detail-panel-subtitle">Source, match, and duplicate checks for this lead.</p>
        <span className={`data-quality-badge data-quality-${quality?.level || "review"}`}>
          {quality?.label || "Needs review"}
        </span>
      </div>

      <div className="lead-detail-grid">
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Building match</span>
          <span className="lead-detail-cell-value">{matchLabel}</span>
        </div>
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Match method</span>
          <span className="lead-detail-cell-value">{match?.method || "-"}</span>
        </div>
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Source</span>
          <span className="lead-detail-cell-value">{lead.sourceId ? "Spreadsheet source" : "Legacy source"}</span>
        </div>
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Duplicate group</span>
          <span className="lead-detail-cell-value">{quality?.duplicate ? `${quality.duplicate.count} matching leads` : "None detected"}</span>
        </div>
      </div>

      <div className="data-quality-issues">
        <span className="lead-detail-cell-label">Issues</span>
        {issues.length ? (
          <div className="data-quality-issue-list">
            {issues.map((issue) => (
              <span key={issue.id} className={`data-quality-issue data-quality-issue-${issue.severity}`}>
                {issue.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">No obvious data issues detected.</p>
        )}
      </div>
    </div>
  );
}

export function MarketPanel({ insight, lead }) {
  const place = insight?.locationName || lead.building || "this building";
  const ready = insight?.status === "ready";
  return (
    <section className="seller-drawer-section">
      <div className="seller-drawer-section-head">
        <h3 className="seller-drawer-section-title">Recent sales</h3>
        <p>{ready && insight.min ? `${place} · ${formatRange(insight.min, insight.max)}` : place}</p>
      </div>

      {insight?.status === "loading" && <p className="seller-drawer-muted">Loading market data…</p>}
      {insight?.status === "error" && <p className="seller-message-error">{insight.error}</p>}
      {!insight?.status && <p className="seller-drawer-muted">No market data available yet.</p>}

      {ready && (
        <>
          <div className="seller-market-stats">
            <div><span>{insight.count}</span><small>Sales</small></div>
            <div><span>{formatPrice(insight.avg)}</span><small>Avg price</small></div>
            <div><span>{formatPsf(insight.psf)}</span><small>Per sqft</small></div>
          </div>
          {insight.recentTransactions?.length > 0 ? (
            <ul className="seller-market-list">
              {insight.recentTransactions.map((transaction) => (
                <li key={transaction.id}>
                  <div className="seller-market-main">
                    <span className="seller-market-place" title={transaction.locationLabel}>{transaction.locationLabel}</span>
                    <span className="seller-market-meta">
                      {[
                        formatDate(transaction.date),
                        transaction.floor && `Floor ${transaction.floor}`,
                        transaction.area && `${Math.round(transaction.area).toLocaleString("en-US")} sqft`,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="seller-market-side">
                    <span className="seller-market-price">{formatPrice(transaction.price)}</span>
                    <span className="seller-market-meta">{formatBedsLabel(transaction.beds)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="seller-drawer-muted">No priced sales found in this period.</p>}
        </>
      )}
    </section>
  );
}

export function MessagePanel({
  onSaveMessage, savingMessage, saveStatus, saveError,
  edited,
  imageUrl,
  hasImage = Boolean(imageUrl),
  imageIncluded = true,
  imageFirstMessageOnly = false,
  onToggleImage,
  onChooseImage,
  attachmentBusy,
  attachmentError,
  message,
  onChangeMessage,
  onResetMessage,
  onSelectTemplate,
  selectedTemplateId,
  templateOptions = [],
  whatsappConnected,
}) {
  const imageShown = hasImage && imageIncluded;
  const imageLocked = imageFirstMessageOnly || !whatsappConnected;
  const imageHint = !whatsappConnected
    ? "Connect WhatsApp in Settings to send images."
    : imageFirstMessageOnly
      ? "Template images only go with the first message."
      : imageShown
        ? "Sent with this seller's next WhatsApp message."
        : "Optional · for this seller's next message only.";

  return (
    <div className="seller-message">
      {templateOptions.length > 1 && (
        <label className="seller-message-template">
          <span>Template</span>
          <select value={selectedTemplateId} onChange={(event) => onSelectTemplate(event.target.value)}>
            {templateOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="seller-message-image">
        {imageShown && imageUrl
          ? <img src={imageUrl} alt="Message attachment preview" />
          : <span className="seller-message-image-empty" aria-hidden="true"><IconPhoto size={20} stroke={1.6} /></span>}
        <div className="seller-message-image-info">
          <strong>{imageShown ? "Image attached" : "No image"}</strong>
          <span>{imageHint}</span>
        </div>
        <div className="seller-message-image-actions">
          {onChooseImage && (
            <label className={`seller-drawer-secondary${attachmentBusy || !whatsappConnected ? " is-disabled" : ""}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={attachmentBusy || !whatsappConnected}
                onChange={(event) => { onChooseImage(event.target.files?.[0]); event.target.value = ""; }}
              />
              {imageShown ? "Change" : "Add"}
            </label>
          )}
          {hasImage && !imageLocked && (
            <button type="button" className={`seller-drawer-text-btn${imageIncluded ? " is-danger" : ""}`} onClick={onToggleImage}>
              {imageIncluded ? "Remove" : "Use template image"}
            </button>
          )}
        </div>
      </div>
      {attachmentError && <p className="seller-message-error" role="alert">{attachmentError}</p>}

      <textarea
        className="seller-message-editor"
        aria-label="Seller message"
        disabled={savingMessage}
        value={message}
        spellCheck={false}
        onChange={(event) => onChangeMessage(event.target.value)}
      />
      <p className="seller-message-hint">Saved for this seller's manual messages. Templates stay unchanged.</p>

      <div className="seller-message-actions">
        <button type="button" className="seller-drawer-secondary" disabled={savingMessage || !message.trim()} onClick={onSaveMessage}>
          {savingMessage ? "Saving…" : "Save message"}
        </button>
        {edited && (
          <button type="button" className="seller-drawer-text-btn" disabled={savingMessage} onClick={onResetMessage}>
            Use template
          </button>
        )}
        {saveStatus && <span className="seller-message-status" role="status">{saveStatus}</span>}
      </div>
      {saveError && <p className="seller-message-error" role="alert">{saveError}</p>}
    </div>
  );
}

export function NotesPanel({ value, onChange, onBlur, saving }) {
  return (
    <div className="seller-notes">
      <textarea
        className="seller-message-editor"
        aria-label="Notes"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="Add a note about this seller..."
        rows={10}
      />
      <p className="seller-message-hint">{saving ? "Saving…" : "Saves a second after you stop typing."}</p>
    </div>
  );
}
