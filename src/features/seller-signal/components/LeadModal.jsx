import { useEffect, useState, useRef } from "react";
import SellerFollowUpControl from './SellerFollowUpControl';
import { introAttachmentPath } from "../../../../supabase/functions/_shared/intro-attachment.js";
import { pickTemplateForStatus, templateStatusId, templateStatusLabels } from "../../../../supabase/functions/_shared/template-status.js";
import {
  IconBrandWhatsapp,
  IconCheck,
  IconCopy,
  IconMessage,
  IconPencil,
  IconX,
} from "@tabler/icons-react";
import { buildMessage, formatPhoneForWhatsApp } from "../insight-utils";
import SellerMessageHistory from "./SellerMessageHistory";
import { formatBuildingLabel } from "../building-utils";
import { extractUnitFromBuilding, formatLeadBedroom, formatLeadUnit } from "./lead-display-utils";
import {
  LeadEditForm,
  MarketPanel,
  MessagePanel,
  NotesPanel,
  SELLER_EDIT_FORM_ID,
  SellerDetailsPanel,
} from "./LeadModalPanels";
import { sellerAvatarColour, sellerInitials } from "./seller-avatar";

// Seller details open in a right-side drawer over the sellers table, laid
// out after Lightfield's contact drawer (Mobbin 76496176): slim title bar,
// avatar and name, a labelled field list, then activity. Tabs and content
// follow the mobile seller sheet: Details (with market data), Notes, Message,
// and History (the WhatsApp thread with this seller).
const SECTIONS = [
  { id: "details", label: "Details" },
  { id: "notes", label: "Notes" },
  { id: "message", label: "Message" },
  { id: "history", label: "History" },
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
  onSaveMessage,
  onSaveFollowUp,
  onSendWhatsApp,
  onStartEditing,
  onHandoff,
  onUpdateStatus,
  templates = [],
  userId,
  initialSection = null,
  whatsappConnected,
}) {
  const [activeSection, setActiveSection] = useState(SECTIONS.some((section) => section.id === initialSection) ? initialSection : "details");
  const [notesValue, setNotesValue] = useState(lead.notes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [templateChoice, setTemplateChoice] = useState("default");
  const [draftMessage, setDraftMessage] = useState(null);
  const [savingMessage, setSavingMessage] = useState(false);
  const [messageSaveStatus, setMessageSaveStatus] = useState("");
  const [messageSaveError, setMessageSaveError] = useState("");
  async function saveMessage(value) {
    setSavingMessage(true); setMessageSaveStatus(""); setMessageSaveError("");
    try { await onSaveMessage(lead.id, value); setDraftMessage(null); setTemplateChoice("default"); setMessageSaveStatus(value === null ? "Template restored" : "Message saved"); }
    catch (error) { setMessageSaveError(error.message || "Could not save. Try again."); }
    finally { setSavingMessage(false); }
  }
  const [imageExcluded, setImageExcluded] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [customPreview, setCustomPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const sendLock = useRef(false);
  useEffect(() => () => { if (customPreview) URL.revokeObjectURL(customPreview); }, [customPreview]);
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

  // Saved seller text takes priority over the template for the seller's
  // status (or the default template). Unsaved edits still apply to the next
  // send; Save persists them.
  const statusTemplate = pickTemplateForStatus(templates, lead.status);
  const statusId = templateStatusId(lead.status);
  const matchedStatus = statusTemplate?.statuses?.includes(statusId)
    ? templateStatusLabels([statusId])[0]
    : null;
  const templateOptions = [
    { id: "default", label: statusTemplate ? `${statusTemplate.name} (${matchedStatus || "default"})` : "Default script" },
    ...templates.filter((template) => template.id !== statusTemplate?.id).map((template) => ({
      id: template.id,
      label: template.name,
    })),
  ];
  const chosenTemplate = templateChoice === "default"
    ? null
    : templates.find((template) => template.id === templateChoice);
  const selectedTemplate = chosenTemplate || statusTemplate;
  const baseMessage = chosenTemplate
    ? buildMessage(lead, insight, chosenTemplate.content)
    : (insight?.message || buildMessage(lead, insight, statusTemplate?.content || messageTemplate));
  const message = draftMessage ?? (templateChoice === "default" ? lead.message_draft : null) ?? baseMessage;
  const messageEdited = draftMessage !== null && draftMessage !== baseMessage;
  const templateImagePath = selectedTemplate?.image_path || null;
  const templateImageUrl = selectedTemplate?.image_url || null;
  const followUp = Boolean(isSent || lead.sentAt || lead.sent_at);
  const selectedImagePath = introAttachmentPath(templateImagePath, lead, isSent, !imageExcluded);

  function handleSelectTemplate(nextId) {
    setTemplateChoice(nextId);
    setDraftMessage(null);
  }

  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);
  const displayBuildingLabel = insight?.locationName || formatBuildingLabel(lead.resolvedBuilding || lead.building) || lead.building || "No building";
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


  const name = lead.name || "Unnamed seller";

  function selectSection(id) {
    handleNotesBlur();
    setActiveSection(id);
  }

  // Like the mobile sheet: Preview message until the Message tab is open,
  // then the send action for this seller.
  function renderFooterAction() {
    if (activeSection !== "message") {
      return (
        <button type="button" className="seller-drawer-primary" onClick={() => selectSection("message")}>
          <IconMessage size={18} stroke={2} aria-hidden="true" />
          Preview message
        </button>
      );
    }

    if (whatsappPhone && whatsappConnected) {
      return (
        <button
          type="button"
          className="seller-drawer-primary is-whatsapp"
          disabled={sending}
          onClick={async () => {
            if (sendLock.current) return;
            sendLock.current = true; setSending(true); setAttachmentError('');
            try {
              const sent = await onSendWhatsApp?.(lead.id, { imagePath: selectedImagePath, message, customImage });
              if (sent) { setCustomImage(null); setImageExcluded(true); }
              else setAttachmentError('Message was not sent. Your attachment is still selected.');
            } catch (failure) { setAttachmentError(failure.message); }
            finally { sendLock.current = false; setSending(false); }
          }}
        >
          {isSent ? <IconCheck size={18} stroke={2} aria-hidden="true" /> : <IconBrandWhatsapp size={18} stroke={2} aria-hidden="true" />}
          {sending ? 'Sending…' : isSent ? "Send follow-up" : "Send via WhatsApp"}
        </button>
      );
    }

    if (whatsappUrl) {
      return (
        <a
          className="seller-drawer-primary is-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onHandoff?.(lead.id)}
        >
          {isSent ? <IconCheck size={18} stroke={2} aria-hidden="true" /> : <IconBrandWhatsapp size={18} stroke={2} aria-hidden="true" />}
          {isSent ? "Sent" : "Send via WhatsApp"}
        </a>
      );
    }

    return (
      <button
        type="button"
        className="seller-drawer-primary is-outline"
        onClick={() => {
          void onCopyMessage(lead.id, message);
          onHandoff?.(lead.id);
        }}
      >
        {copiedLeadId === lead.id ? <IconCheck size={18} stroke={2} aria-hidden="true" /> : <IconCopy size={18} stroke={2} aria-hidden="true" />}
        {isSent ? "Sent" : copiedLeadId === lead.id ? "Copied" : "Copy message"}
      </button>
    );
  }

  const avatarStyle = { background: sellerAvatarColour(lead.id || name) };

  return (
    <div className="seller-drawer-layer">
      <div className="seller-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="seller-drawer" role="dialog" aria-modal="true" aria-label={name}>
        <div className="seller-drawer-bar">
          <span className="seller-drawer-bar-title">
            <span className="seller-drawer-bar-avatar" style={avatarStyle} aria-hidden="true">{sellerInitials(name)}</span>
            <span>{isEditing ? "Edit seller" : name}</span>
          </span>
          {!isEditing && (
            <button
              type="button"
              className="seller-drawer-icon-btn"
              disabled={isSaving || isDeleting}
              onClick={() => onStartEditing?.(lead.id)}
              aria-label="Edit seller"
              title="Edit seller"
            >
              <IconPencil size={17} stroke={1.8} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="seller-drawer-icon-btn" onClick={onClose} aria-label="Close" title="Close">
            <IconX size={18} stroke={1.8} aria-hidden="true" />
          </button>
        </div>

        {isEditing ? (
          <>
            <div className="seller-drawer-scroll">
              <div className="seller-drawer-body">
                <LeadEditForm
                  draft={editDraft}
                  isDeleting={isDeleting}
                  isSaving={isSaving}
                  onChange={onEditFieldChange}
                  onDelete={() => { if (window.confirm(`Delete "${name}"? This cannot be undone.`)) onDelete?.(lead.id); }}
                  onSave={() => onSaveEdit?.(lead.id)}
                />
              </div>
            </div>
            <div className="seller-drawer-footer is-split">
              <button type="button" className="seller-drawer-primary is-outline" disabled={isSaving || isDeleting} onClick={onCancelEditing}>
                Cancel
              </button>
              <button type="submit" form={SELLER_EDIT_FORM_ID} className="seller-drawer-primary" disabled={isSaving || isDeleting}>
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="seller-drawer-scroll">
              <div className="seller-drawer-profile">
                <span className="seller-drawer-avatar" style={avatarStyle} aria-hidden="true">{sellerInitials(name)}</span>
                <div className="seller-drawer-identity">
                  <h2>{name}</h2>
                  <p>{displayBuildingLabel}</p>
                </div>
              </div>

              <div className="seller-drawer-tabs" role="tablist" aria-label="Seller details">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSection === section.id}
                    className={activeSection === section.id ? "is-active" : ""}
                    onClick={() => selectSection(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              <div className={`seller-drawer-body is-${activeSection}`}>
                {activeSection === "details" && (
                  <>
                    <div className="seller-info-card">
                      <SellerDetailsPanel
                        lead={lead}
                        buildingLabel={displayBuildingLabel}
                        bedroomLabel={bedroomLabel}
                        unitLabel={unitLabel}
                        disabled={isSaving || isDeleting}
                        onUpdateStatus={onUpdateStatus}
                      />
                      {onSaveFollowUp && <SellerFollowUpControl lead={lead} onSave={onSaveFollowUp} />}
                    </div>
                    <MarketPanel insight={insight} lead={lead} />
                  </>
                )}
                {activeSection === "history" && <SellerMessageHistory userId={userId} lead={lead} />}
                {activeSection === "message" && (
                  <MessagePanel
                    edited={messageEdited || Boolean(lead.message_draft)}
                    onSaveMessage={() => saveMessage(message)} savingMessage={savingMessage} saveStatus={messageSaveStatus} saveError={messageSaveError}
                    imageUrl={customImage ? customPreview : templateImageUrl}
                    hasImage={Boolean(customImage || templateImagePath)}
                    imageIncluded={Boolean(customImage || selectedImagePath)}
                    imageFirstMessageOnly={!customImage && followUp}
                    onToggleImage={() => { if (customImage) { setCustomImage(null); setImageExcluded(true); } else setImageExcluded(value => !value); }}
                    attachmentError={attachmentError}
                    attachmentBusy={sending}
                    onChooseImage={file => {
                      if (!file) return;
                      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setAttachmentError('Choose a JPG, PNG or WebP image under 5 MB.'); return; }
                      setAttachmentError(''); setCustomImage(file); setCustomPreview(URL.createObjectURL(file));
                    }}
                    message={message}
                    onChangeMessage={value => { setDraftMessage(value); setMessageSaveStatus(""); }}
                    onResetMessage={() => saveMessage(null)}
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

            <div className="seller-drawer-footer">{renderFooterAction()}</div>
          </>
        )}
      </aside>
    </div>
  );
}
