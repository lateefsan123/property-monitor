import { useEffect, useState, useRef } from "react";
import {
  IconBrandWhatsapp,
  IconChartBar,
  IconMessage,
  IconNotes,
  IconShieldCheck,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { buildMessage, formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../building-utils";
import { extractUnitFromBuilding, formatLeadBedroom, formatLeadUnit } from "./lead-display-utils";
import {
  LeadEditForm,
  MarketPanel,
  MessagePanel,
  NotesPanel,
  OverviewPanel,
  DataQualityPanel,
} from "./LeadModalPanels";

const SECTIONS = [
  { id: "overview", label: "Overview", Icon: IconUser },
  { id: "quality", label: "Data quality", Icon: IconShieldCheck },
  { id: "market", label: "Market data", Icon: IconChartBar },
  { id: "message", label: "Message", Icon: IconMessage },
  { id: "notes", label: "Notes", Icon: IconNotes },
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
  messageTemplate,
  onCancelEditing,
  onClose,
  onCopyMessage,
  onDelete,
  onEditFieldChange,
  onSaveEdit,
  onSaveNotes,
  onSendWhatsApp,
  onStartEditing,
  onToggleSent,
  templates = [],
  whatsappConnected,
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [notesValue, setNotesValue] = useState(lead.notes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [templateChoice, setTemplateChoice] = useState("default");
  const [draftMessage, setDraftMessage] = useState(null);
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

  // "default" keeps the saved default script; picking another template or typing
  // in the box only affects this seller's next send.
  const defaultTemplate = templates.find((template) => template.is_default) || null;
  const defaultTemplateName = defaultTemplate?.name;
  const templateOptions = [
    { id: "default", label: defaultTemplateName ? `${defaultTemplateName} (default)` : "Default script" },
    ...templates.filter((template) => !template.is_default).map((template) => ({
      id: template.id,
      label: template.name,
    })),
  ];
  const chosenTemplate = templateChoice === "default"
    ? null
    : templates.find((template) => template.id === templateChoice);
  const selectedTemplate = chosenTemplate || defaultTemplate;
  const baseMessage = chosenTemplate
    ? buildMessage(lead, insight, chosenTemplate.content)
    : (insight?.message || buildMessage(lead, insight, messageTemplate));
  const message = draftMessage ?? baseMessage;
  const messageEdited = draftMessage !== null && draftMessage !== baseMessage;
  const templateImagePath = selectedTemplate?.image_path || null;
  const templateImageUrl = selectedTemplate?.image_url || null;

  function handleSelectTemplate(nextId) {
    setTemplateChoice(nextId);
    setDraftMessage(null);
  }

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
              <IconX size={16} stroke={2} aria-hidden="true" />
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
                        className={`lead-detail-section${active ? " active" : ""}`}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <span className="lead-detail-section-icon">
                          <Icon size={18} stroke={1.8} aria-hidden="true" />
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
                {activeSection === "quality" && (
                  <DataQualityPanel lead={lead} />
                )}
                {activeSection === "market" && (
                  <MarketPanel insight={insight} lead={lead} />
                )}
                {activeSection === "message" && (
                  <MessagePanel
                    edited={messageEdited}
                    imageUrl={templateImageUrl}
                    message={message}
                    onChangeMessage={setDraftMessage}
                    onResetMessage={() => setDraftMessage(null)}
                    onSelectTemplate={handleSelectTemplate}
                    selectedTemplateId={templateChoice}
                    templateOptions={templateOptions}
                    whatsappConnected={whatsappConnected}
                  />
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
              {whatsappPhone && whatsappConnected ? (
                <button
                  type="button"
                  className="lead-modal-wa-btn"
                  onClick={() => void onSendWhatsApp?.(lead.id, { imagePath: templateImagePath, message })}
                >
                  <IconBrandWhatsapp className="icon" size={18} stroke={2} aria-hidden="true" />
                  {isSent ? "Sent" : "Send via WhatsApp"}
                </button>
              ) : whatsappUrl ? (
                <a
                  className="lead-modal-wa-btn"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { if (!isSent) void onToggleSent(lead.id); }}
                >
                  <IconBrandWhatsapp className="icon" size={18} stroke={2} aria-hidden="true" />
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
                  <IconBrandWhatsapp className="icon" size={18} stroke={2} aria-hidden="true" />
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
