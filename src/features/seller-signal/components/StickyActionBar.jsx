import { IconBrandWhatsapp } from "@tabler/icons-react";

export default function StickyActionBar({
  canSendAll,
  onSendAll,
}) {
  return (
    <div className="floating-action-container">
      <button
        type="button"
        className="btn-floating-wa"
        onClick={onSendAll}
        disabled={!canSendAll}
      >
        <IconBrandWhatsapp className="icon-lg" size={24} stroke={2} aria-hidden="true" />
        <div className="btn-floating-text">
          <span className="btn-floating-title">Send All</span>
          <span className="btn-floating-subtitle">on current page</span>
        </div>
      </button>
    </div>
  );
}
