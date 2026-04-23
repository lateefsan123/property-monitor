import { useEffect, useState } from "react";
import { TilePreview } from "./HomePage";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M5.6 5.6l2.8 2.8" />
      <path d="M15.6 15.6l2.8 2.8" />
      <path d="M5.6 18.4l2.8-2.8" />
      <path d="M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

function SellersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function SpreadsheetsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

const OPTIONS = [
  {
    id: "seller",
    label: "Seller",
    Icon: SellersIcon,
    accent: "indigo",
    title: "Add a seller",
    description: "Track a new lead with call notes, contact details, and pipeline status.",
    previewKind: "preview-sellers",
  },
  {
    id: "listing-search",
    label: "Listing search",
    Icon: ListingsIcon,
    accent: "rose",
    title: "Search listings",
    description: "Browse live Dubai listings and watch for units that match your criteria.",
    previewKind: "preview-listings",
  },
  {
    id: "spreadsheet",
    label: "Spreadsheet",
    Icon: SpreadsheetsIcon,
    accent: "emerald",
    title: "Connect a spreadsheet",
    description: "Link a Google Sheet to sync your pipeline in both directions.",
    previewKind: "preview-spreadsheets",
  },
  {
    id: "import",
    label: "Import existing data",
    Icon: ImportIcon,
    accent: "amber",
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
          <span className="create-modal-header-icon" aria-hidden>
            <SparkleIcon />
          </span>
          <span className="create-modal-header-prompt">What do you want to create?</span>
          <button
            type="button"
            className="create-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="create-modal-body">
          <ul className="create-modal-options" role="listbox">
            {OPTIONS.map((option) => {
              const Icon = option.Icon;
              const active = hoveredId === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    className={`create-modal-option accent-${option.accent}${active ? " active" : ""}`}
                    onClick={() => onSelect?.(option.id)}
                    onMouseEnter={() => setHoveredId(option.id)}
                    onFocus={() => setHoveredId(option.id)}
                  >
                    <span className="create-modal-option-icon">
                      <Icon />
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
