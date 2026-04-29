import { formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../building-utils";
import { extractUnitFromBuilding, formatLeadBedroom, formatLeadUnit } from "./lead-display-utils";

function WhatsAppIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function FavoriteIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PinIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 6 4 4H6l4-4-1-6z" />
    </svg>
  );
}

function DataQualityBadge({ quality }) {
  if (!quality?.label) return null;
  return (
    <span
      className={`data-quality-badge data-quality-${quality.level}`}
      title={quality.issues?.map((issue) => issue.label).join(", ") || quality.label}
    >
      {quality.label}
    </span>
  );
}

export default function LeadCard({
  copiedLeadId,
  favorited,
  insight,
  isSent,
  lead,
  onCopyMessage,
  onDelete,
  onToggleExpanded,
  onToggleFavorite,
  onTogglePin,
  onToggleSent,
  pinned,
}) {
  const message = insight?.message || null;
  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);
  const displayBuildingLabel = insight?.locationName
    || formatBuildingLabel(lead.resolvedBuilding || lead.building)
    || lead.resolvedBuilding
    || lead.building
    || "-";
  const buildingTitle = lead.resolvedBuilding && lead.resolvedBuilding !== lead.building
    ? `${displayBuildingLabel} (from ${lead.building})`
    : displayBuildingLabel;
  const bedroomLabel = formatLeadBedroom(lead.bedroom);
  const unitLabel = formatLeadUnit(lead.unit || extractUnitFromBuilding(lead.building));
  const whatsappUrl = whatsappPhone
    ? `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(message || "")}`
    : null;

  const sendButton = whatsappUrl ? (
    <a
      className="btn-sm btn-wa"
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        event.stopPropagation();
        if (!isSent) void onToggleSent(lead.id);
      }}
    >
      <WhatsAppIcon />
      {isSent ? "Sent" : "Send"}
    </a>
  ) : (
    <button
      type="button"
      className="btn-sm btn-wa btn-wa-nophone"
      onClick={(event) => {
        event.stopPropagation();
        if (message) void onCopyMessage(lead.id, message);
        if (!isSent) void onToggleSent(lead.id);
      }}
    >
      <WhatsAppIcon />
      {isSent ? "Sent" : copiedLeadId === lead.id ? "Copied" : "No #"}
    </button>
  );

  const rowClasses = [
    "lead-row",
    isSent ? "lead-sent" : "",
    pinned ? "is-pinned" : "",
    favorited ? "is-favorited" : "",
  ].filter(Boolean).join(" ");

  return (
    <tr
      className={rowClasses}
      onClick={() => onToggleExpanded(lead.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (window.confirm(`Delete "${lead.name || "this lead"}"?`)) {
          onDelete?.(lead.id);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleExpanded(lead.id);
        }
      }}
      tabIndex={0}
      role="button"
    >
      <td className="lead-cell-name">
        <div className="lead-name-wrap">
          <span className="lead-name">{lead.name || "Unnamed"}</span>
          <span className="lead-row-marks" onClick={(e) => e.stopPropagation()}>
            {onTogglePin && (
              <button
                type="button"
                className={`lead-row-mark${pinned ? " is-active" : ""}`}
                onClick={() => onTogglePin(lead.id)}
                aria-label={pinned ? "Unpin seller" : "Pin seller"}
                title={pinned ? "Unpin" : "Pin"}
              >
                <PinIcon filled={pinned} />
              </button>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                className={`lead-row-mark${favorited ? " is-active is-favorite" : ""}`}
                onClick={() => onToggleFavorite(lead.id)}
                aria-label={favorited ? "Unfavorite seller" : "Favorite seller"}
                title={favorited ? "Unfavorite" : "Favorite"}
              >
                <FavoriteIcon filled={favorited} />
              </button>
            )}
          </span>
        </div>
      </td>
      <td className="lead-cell-building">
        <span className="lead-building-label" title={buildingTitle}>{displayBuildingLabel}</span>
        <DataQualityBadge quality={lead.dataQuality} />
      </td>
      <td className="lead-cell-bed">
        {bedroomLabel || <span className="text-muted">—</span>}
      </td>
      <td className="lead-cell-unit">
        {unitLabel || <span className="text-muted">—</span>}
      </td>
      <td className="lead-cell-status">
        <span className={`badge ${lead.isDue ? "due" : ""}`}>{lead.statusLabel}</span>
      </td>
      <td className="lead-cell-phone">
        {lead.phone || <span className="text-muted">—</span>}
      </td>
      <td className="lead-cell-action" onClick={(e) => e.stopPropagation()}>
        {sendButton}
      </td>
    </tr>
  );
}
