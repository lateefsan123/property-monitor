import { IconX } from "@tabler/icons-react";

export default function SellerSelectionBar({
  allMasked,
  count,
  onClear,
  onDelete,
  onMask,
  onSelectAll,
  onUnmask,
  total,
}) {
  return (
    <div className="selection-bar" role="toolbar" aria-label="Seller selection actions">
      <button
        type="button"
        className="selection-bar-close"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <IconX size={16} stroke={2} aria-hidden="true" />
      </button>
      <span className="selection-bar-count">{count} selected</span>
      <span className="selection-bar-divider" />
      <button
        type="button"
        className="selection-bar-link"
        onClick={onSelectAll}
        disabled={count >= total}
      >
        Select all
      </button>
      <span className="selection-bar-grow" />
      <button
        type="button"
        className="selection-bar-action"
        onClick={allMasked ? onUnmask : onMask}
        title={allMasked ? "Mark selected as prospect" : "Mark selected as sent"}
      >
        {allMasked ? "Unmask" : "Mask"}
      </button>
      <button
        type="button"
        className="selection-bar-action is-destructive"
        onClick={onDelete}
        title="Delete selected sellers"
      >
        Delete
      </button>
    </div>
  );
}
