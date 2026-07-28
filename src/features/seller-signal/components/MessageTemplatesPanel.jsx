import { useEffect, useRef, useState } from "react";
import {
  IconPhoto,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { DEFAULT_MESSAGE_TEMPLATE } from "../insight-utils";
import {
  MESSAGE_TEMPLATE_IMAGE_MAX_BYTES,
  MESSAGE_TEMPLATE_IMAGE_TYPES,
} from "../message-template-services";

const NEW_TEMPLATE_ID = "new";
const MESSAGE_PREVIEW_TRANSACTIONS = `- St. Regis Residences | 2 Bed | AED 4.95M | 1,410 sqft
- St. Regis Residences | 1 Bed | AED 3.15M | 910 sqft`;

function renderMessagePreview(templateContent) {
  const rendered = String(templateContent || "")
    .replaceAll("{{name}}", "Lateef")
    .replaceAll("{{building}}", "St. Regis Residences")
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
  const imageInputRef = useRef(null);
  const localImageUrlRef = useRef(null);
  const textareaRef = useRef(null);
  const selectedTemplate = templates.find((template) => template.id === selectedId) || null;
  const previewMessage = renderMessagePreview(content);

  useEffect(() => () => {
    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function setTemplateImage(template) {
    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
    localImageUrlRef.current = null;
    setImageFile(null);
    setImagePreviewUrl(template?.image_url || null);
    setRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function selectTemplate(nextId) {
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
    <div
      className="message-template-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="message-template-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-template-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="message-template-modal-header">
          <div>
            <h1 id="message-template-title">Message templates</h1>
            <p>Personalize the script and image used for every matching WhatsApp send.</p>
          </div>
          <button
            type="button"
            className="message-template-close"
            onClick={onClose}
            aria-label="Close message templates"
          >
            <IconX size={18} stroke={1.8} aria-hidden="true" />
          </button>
        </header>
        <div className="message-template-modal-body">
          {loading ? (
        <p className="muted">Loading templates...</p>
      ) : (
        <div className="message-template-workspace">
          <div className="message-template-editor">
            <div className="message-template-fields">
            <label>
              <span>Saved template</span>
              <select value={selectedId} onChange={(event) => selectTemplate(event.target.value)}>
                <option value={NEW_TEMPLATE_ID}>New template (starts from built-in script)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}{template.is_default ? " (Default)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Template name</span>
              <input
                type="text"
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Transaction update"
              />
            </label>
          </div>

          <label className="message-template-body-field">
            <span>Message script</span>
            <textarea
              ref={textareaRef}
              value={content}
              maxLength={4000}
              rows={9}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>

          <div className="message-template-image-field">
            <div className="message-template-image-copy">
              <span>Template image</span>
              <p>Optional. This image is reused whenever the template sends.</p>
            </div>
            {imagePreviewUrl ? (
              <div className="message-template-image-preview">
                <img src={imagePreviewUrl} alt="Template attachment preview" />
                <div className="message-template-image-actions">
                  <button type="button" className="btn-sm" onClick={() => imageInputRef.current?.click()}>
                    <IconUpload size={15} stroke={1.9} aria-hidden="true" />
                    Replace image
                  </button>
                  <button type="button" className="btn-sm message-template-image-remove" onClick={clearImage}>
                    <IconTrash size={15} stroke={1.9} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="message-template-image-picker"
                onClick={() => imageInputRef.current?.click()}
              >
                <IconPhoto size={22} stroke={1.7} aria-hidden="true" />
                <span>Choose image</span>
                <small>JPG, PNG, or WebP · up to 5 MB</small>
              </button>
            )}
            <input
              ref={imageInputRef}
              className="message-template-image-input"
              type="file"
              accept={MESSAGE_TEMPLATE_IMAGE_TYPES.join(",")}
              onChange={chooseImage}
            />
            <p className="message-template-help">
              The message becomes the image caption. WhatsApp allows captions up to 1,024 characters after placeholders are filled.
            </p>
          </div>

          <div className="message-template-token-row">
            <span>Insert:</span>
            {["{{name}}", "{{building}}", "{{transactions}}"].map((token) => (
              <button key={token} type="button" onClick={() => insertToken(token)}>{token}</button>
            ))}
          </div>
          <p className="message-template-help">
            <code>{"{{transactions}}"}</code> is required and is replaced with the real sale lines at send time.
          </p>

          {error && <p className="message-template-error">{error}</p>}
          {notice && <p className="message-template-notice">{notice}</p>}

          <div className="message-template-actions">
            <button type="button" className="btn-sm btn-primary" disabled={saving} onClick={saveTemplate}>
              {saving ? "Saving..." : selectedTemplate ? "Save changes" : "Create template"}
            </button>
            {selectedTemplate && !selectedTemplate.is_default && (
              <button type="button" className="btn-sm" disabled={saving} onClick={setAsDefault}>
                Use as default
              </button>
            )}
            {selectedTemplate && (
              <button
                type="button"
                className="btn-sm message-template-delete"
                disabled={saving}
                onClick={deleteTemplate}
              >
                <IconTrash size={15} stroke={1.9} aria-hidden="true" />
                Delete
              </button>
            )}
            {!selectedTemplate && templates.length === 0 && (
              <span className="message-template-new-label">
                This will become your default and replace the built-in script for every send.
              </span>
            )}
            {!selectedTemplate && templates.length > 0 && (
              <span className="message-template-new-label"><IconPlus size={14} aria-hidden="true" /> New script</span>
            )}
            </div>
          </div>

          <aside className="message-template-live-preview" aria-label="Message preview">
            <div className="message-template-preview-head">
              <div>
                <span>Preview</span>
                <p>Sample seller and transaction data</p>
              </div>
              <span className="message-template-preview-badge">WhatsApp</span>
            </div>
            <div className="message-template-chat-preview">
              <div className="message-template-chat-bubble">
                {imagePreviewUrl && (
                  <img src={imagePreviewUrl} alt="Preview of the template attachment" />
                )}
                <p>{previewMessage}</p>
                <span className="message-template-chat-meta">
                  10:10 <b aria-label="Delivered">✓✓</b>
                </span>
              </div>
            </div>
          </aside>
        </div>
          )}
        </div>
      </section>
    </div>
  );
}
