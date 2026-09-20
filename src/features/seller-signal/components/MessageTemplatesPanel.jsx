import { useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconDots,
  IconPhoto,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { DEFAULT_MESSAGE_TEMPLATE } from "../insight-utils";
import {
  MESSAGE_TEMPLATE_IMAGE_MAX_BYTES,
  MESSAGE_TEMPLATE_IMAGE_TYPES,
} from "../message-template-services";

const NEW_TEMPLATE_ID = "new";
const MESSAGE_PREVIEW_TRANSACTIONS = "2 bed · AED 2.9M · 992 sqft";

function renderMessagePreview(templateContent) {
  const rendered = String(templateContent || "")
    .replaceAll("{{name}}", "Alex")
    .replaceAll("{{building}}", "Forte 2")
    .replaceAll("{{transactions}}", MESSAGE_PREVIEW_TRANSACTIONS)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return rendered || "Your message preview will appear here.";
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Could not save the template.");
}

export default function MessageTemplatesPanel({
  loading,
  onClose,
  onDelete,
  onSave,
  onSetDefault,
  saving,
  templates = [],
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id || NEW_TEMPLATE_ID);
  const [name, setName] = useState(templates[0]?.name || "Transaction update");
  const [content, setContent] = useState(templates[0]?.content || DEFAULT_MESSAGE_TEMPLATE);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(templates[0]?.image_url || null);
  const [removeImage, setRemoveImage] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const actionsRef = useRef(null);
  const imageInputRef = useRef(null);
  const localImageUrlRef = useRef(null);
  const textareaRef = useRef(null);
  const selectedTemplate = templates.find((template) => template.id === selectedId) || null;
  const previewMessage = renderMessagePreview(content);

  useEffect(() => () => {
    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    modalRef.current?.querySelector('button')?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    const modal = modalRef.current;
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (actionsRef.current?.open) {
          actionsRef.current.open = false;
          actionsRef.current.querySelector('summary')?.focus();
        } else if (!saving) onClose?.();
      }
      if (event.key === "Tab") {
        const controls = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary')]
          .filter((element) => element.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }
    }
    modal.addEventListener("keydown", handleKeyDown);
    return () => {
      modal.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  function setTemplateImage(template) {
    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
    localImageUrlRef.current = null;
    setImageFile(null);
    setImagePreviewUrl(template?.image_url || null);
    setRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function selectTemplate(nextId) {
    if (actionsRef.current) actionsRef.current.open = false;
    const nextTemplate = templates.find((template) => template.id === nextId);
    setSelectedId(nextId);
    setName(nextTemplate?.name || "Transaction update");
    setContent(nextTemplate?.content || DEFAULT_MESSAGE_TEMPLATE);
    setTemplateImage(nextTemplate);
    setNotice(null);
    setError(null);
  }

  function insertToken(token) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((value) => `${value}${token}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setContent((value) => `${value.slice(0, start)}${token}${value.slice(end)}`);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function saveTemplate() {
    setError(null);
    setNotice(null);
    try {
      const saved = await onSave({
        id: selectedTemplate?.id,
        imageFile,
        imagePath: selectedTemplate?.image_path || null,
        name,
        content,
        isDefault: Boolean(selectedTemplate?.is_default),
        removeImage,
      });
      if (saved?.id) {
        setSelectedId(saved.id);
        setTemplateImage(saved);
      }
      setNotice("Template saved.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  async function setAsDefault() {
    if (actionsRef.current) actionsRef.current.open = false;
    if (!selectedTemplate) return;
    setError(null);
    setNotice(null);
    try {
      await onSetDefault(selectedTemplate.id);
      setNotice("This is now the default for previews and sends.");
    } catch (defaultError) {
      setError(getErrorMessage(defaultError));
    }
  }

  async function deleteTemplate() {
    if (actionsRef.current) actionsRef.current.open = false;
    if (!selectedTemplate) return;
    if (!window.confirm(`Delete "${selectedTemplate.name}"?`)) return;
    setError(null);
    setNotice(null);
    try {
      await onDelete(selectedTemplate.id);
      setSelectedId(NEW_TEMPLATE_ID);
      setName("Transaction update");
      setContent(DEFAULT_MESSAGE_TEMPLATE);
      setTemplateImage(null);
      setNotice("Template deleted.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  function chooseImage(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!MESSAGE_TEMPLATE_IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MESSAGE_TEMPLATE_IMAGE_MAX_BYTES) {
      setError("Template images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    localImageUrlRef.current = previewUrl;
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setRemoveImage(false);
  }

  function clearImage() {
    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
    localImageUrlRef.current = null;
    setImageFile(null);
    setImagePreviewUrl(null);
    setRemoveImage(Boolean(selectedTemplate?.image_path));
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  return (
    <div className="message-template-overlay" role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose?.(); }}>
      <section ref={modalRef} className="message-template-modal" role="dialog"
        aria-modal="true" aria-labelledby="message-template-title">
        <header className="message-template-modal-header">
          <h1 id="message-template-title">Message templates</h1>
          <button type="button" className="message-template-close" disabled={saving}
            onClick={onClose} aria-label="Close message templates">
            <IconX size={26} stroke={1.8} aria-hidden="true" />
          </button>
        </header>
        <div className="message-template-modal-body">
          {loading ? <p role="status" className="message-template-loading">Loading templates…</p> : (
            <div className="message-template-workspace">
              <nav className="message-template-library" aria-label="Saved templates">
                <button type="button" className="message-template-new" disabled={saving}
                  onClick={() => selectTemplate(NEW_TEMPLATE_ID)}>
                  <IconPlus size={22} stroke={1.7} aria-hidden="true" /> New template
                </button>
                {templates.map((template) => (
                  <button type="button" key={template.id} disabled={saving}
                    aria-current={selectedId === template.id ? "true" : undefined}
                    className={selectedId === template.id ? "is-selected" : ""}
                    onClick={() => selectTemplate(template.id)}>
                    <span>{template.name}</span>
                    {template.is_default ? <IconCheck className="message-template-default" size={20} aria-label="Default template" /> : null}
                  </button>
                ))}
              </nav>
              <div className="message-template-editor">
                <div className="message-template-name-row">
                  <label className="message-template-name-field">
                    <span>Template name</span>
                    <input type="text" maxLength={80} value={name} disabled={saving}
                      onChange={(event) => setName(event.target.value)} placeholder="Transaction update" />
                  </label>
                  {selectedTemplate ? (
                    <details className="message-template-more" ref={actionsRef}>
                      <summary aria-label="Template actions"><IconDots size={22} aria-hidden="true" /></summary>
                      <div className="message-template-more-menu">
                        <button type="button" disabled={saving || selectedTemplate.is_default} onClick={setAsDefault}>
                          {selectedTemplate.is_default ? "Default template" : "Use as default"}
                        </button>
                        <button type="button" disabled={saving} className="message-template-delete" onClick={deleteTemplate}>Delete template</button>
                      </div>
                    </details>
                  ) : null}
                </div>
                <label className="message-template-body-field">
                  <span>Message</span>
                  <textarea ref={textareaRef} value={content} maxLength={4000} rows={9} disabled={saving}
                    onChange={(event) => setContent(event.target.value)} />
                </label>
                <div className="message-template-token-field">
                  <span>Insert variable</span>
                  <div className="message-template-token-row">
                    {["{{name}}", "{{building}}", "{{transactions}}"].map((token) => (
                      <button key={token} type="button" disabled={saving} onClick={() => insertToken(token)}>{token}</button>
                    ))}
                  </div>
                </div>
                <div className="message-template-image-field">
                  <span>Attached image <span className="message-template-optional">(optional)</span></span>
                  {imagePreviewUrl ? (
                    <div className="message-template-image-preview">
                      <img src={imagePreviewUrl} alt="Template attachment preview" />
                      <div>
                        <span className="message-template-image-name">{imageFile?.name || "Attached image"}</span>
                        <div className="message-template-image-actions">
                          <button type="button" disabled={saving} onClick={() => imageInputRef.current?.click()}>Replace</button>
                          <span aria-hidden="true">|</span>
                          <button type="button" disabled={saving} onClick={clearImage}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="message-template-image-picker" disabled={saving}
                      title="JPG, PNG or WebP, up to 5 MB" onClick={() => imageInputRef.current?.click()}>
                      <IconPhoto size={20} stroke={1.7} aria-hidden="true" /> Add image
                    </button>
                  )}
                  <input ref={imageInputRef} className="message-template-image-input" type="file"
                    aria-label="Attach template image" accept={MESSAGE_TEMPLATE_IMAGE_TYPES.join(",")} onChange={chooseImage} />
                </div>
              </div>
              <aside className="message-template-live-preview" aria-label="Message preview">
                <h2 className="message-template-preview-head">Preview (WhatsApp)</h2>
                <div className="message-template-chat-bubble">
                  {imagePreviewUrl ? <img src={imagePreviewUrl} alt="Preview of the template attachment" /> : null}
                  <p>{previewMessage}</p>
                </div>
              </aside>
            </div>
          )}
        </div>
        <footer className="message-template-actions">
          <div aria-live="polite">
            {error ? <p role="alert" className="message-template-error">{error}</p> : null}
            {notice ? <p className="message-template-notice">{notice}</p> : null}
          </div>
          <button type="button" className="message-template-save" disabled={saving || loading} onClick={saveTemplate}>
            {saving ? "Saving…" : selectedTemplate ? "Save changes" : "Create template"}
          </button>
        </footer>
      </section>
    </div>
  );
}
