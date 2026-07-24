import { useRef, useState } from "react";
import { IconCheck, IconPlus, IconTrash } from "@tabler/icons-react";
import { DEFAULT_MESSAGE_TEMPLATE } from "../insight-utils";

const NEW_TEMPLATE_ID = "new";

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Could not save the template.");
}

export default function MessageTemplatesPanel({
  activeTemplate,
  loading,
  onDelete,
  onSave,
  onSetDefault,
  saving,
  templates = [],
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id || NEW_TEMPLATE_ID);
  const [name, setName] = useState(templates[0]?.name || "Transaction update");
  const [content, setContent] = useState(templates[0]?.content || DEFAULT_MESSAGE_TEMPLATE);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const textareaRef = useRef(null);
  const selectedTemplate = templates.find((template) => template.id === selectedId) || null;

  function selectTemplate(nextId) {
    const nextTemplate = templates.find((template) => template.id === nextId);
    setSelectedId(nextId);
    setName(nextTemplate?.name || "Transaction update");
    setContent(nextTemplate?.content || DEFAULT_MESSAGE_TEMPLATE);
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
        name,
        content,
        isDefault: Boolean(selectedTemplate?.is_default),
      });
      if (saved?.id) setSelectedId(saved.id);
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
      setNotice("Template deleted.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  return (
    <section className="message-template-panel" aria-labelledby="message-template-title">
      <div className="message-template-head">
        <div>
          <h2 id="message-template-title">Message templates</h2>
          <p>Personalize the script while keeping the latest transaction details in every message.</p>
        </div>
        <div className="message-template-head-actions">
          <span className="message-template-default-badge">
            <IconCheck size={14} stroke={2.4} aria-hidden="true" />
            Default: {activeTemplate ? activeTemplate.name : "Built-in script"}
          </span>
          <button type="button" className="btn-sm" onClick={() => setOpen((value) => !value)}>
            {open ? "Close editor" : "Edit templates"}
          </button>
        </div>
      </div>

      {open && (loading ? (
        <p className="muted">Loading templates...</p>
      ) : (
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
      ))}
    </section>
  );
}
