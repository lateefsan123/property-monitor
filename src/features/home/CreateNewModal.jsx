import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";
import TilePreview from "./TilePreview";

const OPTIONS = [
  {
    id: "seller",
    label: "Seller",
    title: "Add a seller",
    description: "Track a new lead with call notes, contact details, and pipeline status.",
    previewKind: "preview-sellers",
  },
  {
    id: "listing-search",
    label: "Listing search",
    title: "Search listings",
    description: "Browse live Dubai listings and watch for units that match your criteria.",
    previewKind: "preview-listings",
  },
  {
    id: "spreadsheet",
    label: "Spreadsheet",
    title: "Connect a spreadsheet",
    description: "Link a Google Sheet to sync your pipeline in both directions.",
    previewKind: "preview-spreadsheets",
  },
  {
    id: "import",
    label: "Import existing data",
    title: "Import existing data",
    description: "Bring in leads from a CSV or Google Sheet you already have.",
    previewKind: "preview-spreadsheets",
  },
];

function PreviewPanel({ option }) {
  if (!option) return null;

  return (
    <div className="create-modal-preview">
      <div className="create-modal-preview-art">
        <TilePreview kind={option.previewKind} />
      </div>
      <div className="create-modal-preview-body">
        <h3 className="create-modal-preview-title">{option.title}</h3>
        <p className="create-modal-preview-desc">{option.description}</p>
      </div>
    </div>
  );
}

export default function CreateNewModal({ onClose, onSelect }) {
  const [hoveredId, setHoveredId] = useState(OPTIONS[0].id);

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

  const activeOption = OPTIONS.find((option) => option.id === hoveredId) || OPTIONS[0];

  return (
    <div className="create-modal-backdrop" onClick={onClose}>
      <div
        className="create-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create new"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="create-modal-header">
          <span className="create-modal-header-prompt">New</span>
          <button
            type="button"
            className="create-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={16} stroke={2} aria-hidden="true" />
          </button>
        </div>

        <div className="create-modal-body">
          <ul className="create-modal-options" role="listbox">
            {OPTIONS.map((option) => {
              const active = hoveredId === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    className={`create-modal-option${active ? " active" : ""}`}
                    onClick={() => onSelect?.(option.id)}
                    onMouseEnter={() => setHoveredId(option.id)}
                    onFocus={() => setHoveredId(option.id)}
                  >
                    <span className="create-modal-option-preview" aria-hidden="true">
                      <TilePreview kind={option.previewKind} />
                    </span>
                    <span className="create-modal-option-label">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <PreviewPanel option={activeOption} />
        </div>
      </div>
    </div>
  );
}
