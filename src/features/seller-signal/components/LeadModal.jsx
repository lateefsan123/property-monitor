import { useEffect, useState, useRef } from "react";
import { buildMessage, formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../building-utils";
import { formatLeadBedroom, extractUnitFromBuilding, formatLeadUnit, WhatsAppIcon } from "./LeadCard";
import {
  LeadEditForm,
  MarketPanel,
  MessagePanel,
  NotesPanel,
  OverviewPanel,
} from "./LeadModalPanels";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

const SECTIONS = [
  { id: "overview", label: "Overview", accent: "indigo", Icon: UserIcon },
  { id: "market", label: "Market data", accent: "emerald", Icon: ChartIcon },
  { id: "message", label: "Message", accent: "amber", Icon: MessageIcon },
  { id: "notes", label: "Notes", accent: "rose", Icon: NotesIcon },
];

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
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [notesValue, setNotesValue] = useState(lead.notes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimerRef = useRef(null);

  function handleNotesChange(event) {
    const next = event.target.value;
    setNotesValue(next);
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

  const initials = (lead.name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div
        className="lead-modal lead-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={lead.name || "Seller"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lead-detail-header">
          <span className="lead-detail-header-icon" aria-hidden>{initials}</span>
          <div className="lead-detail-header-title">
            <h2 className="lead-detail-name">{lead.name || "Unnamed"}</h2>
            <span className="lead-detail-building">{displayBuildingLabel}</span>
          </div>
          <div className="lead-detail-header-actions">
            {!isEditing && (
              <button
                type="button"
                className="btn-sm"
                disabled={isSaving || isDeleting}
                onClick={() => onStartEditing?.(lead.id)}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="lead-detail-close"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="lead-detail-body lead-detail-body-edit">
            <LeadEditForm
              draft={editDraft}
              isDeleting={isDeleting}
              isSaving={isSaving}
              onCancel={onCancelEditing}
              onChange={onEditFieldChange}
              onDelete={() => onDelete?.(lead.id)}
              onSave={() => onSaveEdit?.(lead.id)}
            />
          </div>
        ) : (
          <>
            <div className="lead-detail-body">
              <ul className="lead-detail-sections" role="tablist">
                {SECTIONS.map((section) => {
                  const Icon = section.Icon;
                  const active = activeSection === section.id;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`lead-detail-section accent-${section.accent}${active ? " active" : ""}`}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <span className="lead-detail-section-icon">
                          <Icon />
                        </span>
                        <span className="lead-detail-section-label">{section.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="lead-detail-content">
                {activeSection === "overview" && (
                  <OverviewPanel lead={lead} bedroomLabel={bedroomLabel} unitLabel={unitLabel} />
                )}
                {activeSection === "market" && (
                  <MarketPanel insight={insight} lead={lead} />
                )}
                {activeSection === "message" && (
                  <MessagePanel message={message} />
                )}
                {activeSection === "notes" && (
                  <NotesPanel
                    value={notesValue}
                    onChange={handleNotesChange}
                    onBlur={handleNotesBlur}
                    saving={notesSaving}
                  />
                )}
              </div>
            </div>

            <div className="lead-detail-footer">
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
          </>
        )}
      </div>
    </div>
  );
}
