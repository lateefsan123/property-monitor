import { useEffect, useState } from "react";
import { IconUsers, IconX } from "@tabler/icons-react";

// Add seller opens in the same right-side drawer as the seller details, with
// the same fields and footer as Edit seller.
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

const FORM_ID = "add-seller-form";

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
  const input = (field, props) => (
    <input value={draft[field]} disabled={submitting} onChange={(event) => updateField(field, event.target.value)} {...props} />
  );

  return (
    <div className="seller-drawer-layer">
      <div className="seller-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="seller-drawer" role="dialog" aria-modal="true" aria-labelledby="add-seller-title">
        <div className="seller-drawer-bar">
          <span className="seller-drawer-bar-title">
            <IconUsers size={17} stroke={1.8} aria-hidden="true" />
            <span id="add-seller-title">Add seller{sourceLabel ? ` to ${sourceLabel}` : ""}</span>
          </span>
          <button type="button" className="seller-drawer-icon-btn" onClick={onClose} aria-label="Close" title="Close">
            <IconX size={18} stroke={1.8} aria-hidden="true" />
          </button>
        </div>

        <div className="seller-drawer-scroll">
          <div className="seller-drawer-body">
            <form id={FORM_ID} className="seller-edit" onSubmit={handleSubmit}>
              <label className="seller-edit-field">
                <span>Name</span>
                {input("name", { type: "text", placeholder: "Seller name", autoFocus: true })}
              </label>
              <label className="seller-edit-field">
                <span>Phone</span>
                {input("phone", { type: "tel", placeholder: "+971..." })}
              </label>
              <label className="seller-edit-field">
                <span>Building</span>
                {input("building", { type: "text", placeholder: "Building name" })}
              </label>
              <div className="seller-edit-row">
                <label className="seller-edit-field">
                  <span>Unit</span>
                  {input("unit", { type: "text", placeholder: "1203" })}
                </label>
                <label className="seller-edit-field">
                  <span>Bedrooms</span>
                  {input("bedroom", { type: "text", placeholder: "2BR" })}
                </label>
              </div>
              <div className="seller-edit-field">
                <span>Status</span>
                <div className="seller-edit-chips" role="radiogroup" aria-label="Status">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value || "blank"}
                      type="button"
                      role="radio"
                      aria-checked={draft.status === option.value}
                      className={draft.status === option.value ? "is-active" : ""}
                      disabled={submitting}
                      onClick={() => updateField("status", option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="seller-edit-field">
                <span>Last contact</span>
                {input("lastContact", { type: "date" })}
              </label>
              <p className="seller-message-hint">Add at least a name, phone or building. Everything else is optional.</p>
            </form>
          </div>
        </div>

        <div className="seller-drawer-footer is-split">
          <button type="button" className="seller-drawer-primary is-outline" disabled={submitting} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="seller-drawer-primary" disabled={disabled}>
            {submitting ? "Adding…" : "Add seller"}
          </button>
        </div>
      </aside>
    </div>
  );
}
