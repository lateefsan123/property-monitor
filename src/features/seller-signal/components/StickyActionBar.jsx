import { useState } from "react";
import { IconBrandWhatsapp } from "@tabler/icons-react";

export default function StickyActionBar({
  canSendAll,
  onSendAll,
  sendAllCount,
  whatsappConnected,
}) {
  const [sending, setSending] = useState(false);
  const readyCount = Number(sendAllCount || 0);
  const disabled = !canSendAll || !whatsappConnected || sending;

  async function handleSend() {
    if (disabled) return;
    const messageLabel = `${readyCount} automated WhatsApp message${readyCount === 1 ? "" : "s"}`;
    if (!window.confirm(`Send ${messageLabel} from the current page?`)) return;

    setSending(true);
    try {
      await onSendAll?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="floating-action-container">
      <button
        type="button"
        className="btn-floating-wa"
        onClick={handleSend}
        disabled={disabled}
        aria-busy={sending ? "true" : undefined}
        title={!whatsappConnected ? "Connect WhatsApp to send automated messages" : undefined}
      >
        <IconBrandWhatsapp className="icon-lg" size={24} stroke={2} aria-hidden="true" />
        <div className="btn-floating-text">
          <span className="btn-floating-title">{sending ? "Sending..." : "Send automated messages"}</span>
          <span className="btn-floating-subtitle">
            {!whatsappConnected
              ? "Connect WhatsApp first"
              : `${readyCount} ready on current page`}
          </span>
        </div>
      </button>
    </div>
  );
}
