import { useEffect, useState } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "No status" },
  { value: "Prospect", label: "Prospect" },
  { value: "Appraisal", label: "Appraisal" },
  { value: "For Sale", label: "For Sale" },
  { value: "Not Interested", label: "Not Interested" },
];

const EMPTY_DRAFT = {
  name: "",
  building: "",
  bedroom: "",
  unit: "",
  phone: "",
  status: "",
  lastContact: "",
};

function CloseIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function AddSellerModal({ onClose, onSubmit, submitting, sourceLabel }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onSubmit?.(draft);
    if (ok) onClose?.();
  }

  const hasMinimum = [draft.name, draft.building, draft.phone].some((value) => String(value || "").trim());
  const disabled = submitting || !hasMinimum;

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div className="lead-modal" onClick={(event) => event.stopPropagation()}>
        <div className="lead-modal-header">
          <div className="lead-modal-title-block">
            <h2 className="lead-modal-name">Add seller</h2>
            {sourceLabel ? <span className="lead-modal-building">to {sourceLabel}</span> : null}
          </div>
          <div className="lead-modal-header-actions">
            <button type="button" className="lead-modal-close" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="lead-modal-body">
          <form className="lead-edit-form" onSubmit={handleSubmit}>
            <div className="lead-edit-grid">
              <label className="lead-edit-field">
                <span>Name</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Seller name"
                  disabled={submitting}
                />
              </label>

              <label className="lead-edit-field">
                <span>Building</span>
                <input
                  type="text"
                  value={draft.building}
                  onChange={(event) => updateField("building", event.target.value)}
                  placeholder="Building name"
                  disabled={submitting}
                />
              </label>

              <label className="lead-edit-field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="+971..."
                  disabled={submitting}
                />
              </label>

              <label className="lead-edit-field">
                <span>Bedroom</span>
                <input
                  type="text"
                  value={draft.bedroom}
                  onChange={(event) => updateField("bedroom", event.target.value)}
                  placeholder="2BR"
                  disabled={submitting}
                />
              </label>

              <label className="lead-edit-field">
                <span>Unit</span>
                <input
                  type="text"
                  value={draft.unit}
                  onChange={(event) => updateField("unit", event.target.value)}
                  placeholder="Unit 1203"
                  disabled={submitting}
                />
              </label>

              <label className="lead-edit-field">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  disabled={submitting}
                >
                  {STATUS_OPTIONS.map((option) => (
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
                  value={draft.lastContact}
                  onChange={(event) => updateField("lastContact", event.target.value)}
                  disabled={submitting}
                />
              </label>
            </div>

            <div className="lead-edit-actions">
              <button type="submit" className="btn-sm btn-primary" disabled={disabled}>
                {submitting ? "Adding..." : "Add seller"}
              </button>
              <button type="button" className="btn-sm" disabled={submitting} onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
