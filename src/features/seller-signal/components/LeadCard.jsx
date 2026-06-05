import {
  IconBrandWhatsapp,
  IconPinned,
  IconPinnedFilled,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../building-utils";
import { extractUnitFromBuilding, formatLeadBedroom, formatLeadUnit } from "./lead-display-utils";

function WhatsAppIcon() {
  return <IconBrandWhatsapp className="icon" size={16} stroke={2} aria-hidden="true" />;
}

function FavoriteIcon({ filled }) {
  const Icon = filled ? IconStarFilled : IconStar;
  return <Icon size={15} stroke={1.8} aria-hidden="true" />;
}

function PinIcon({ filled }) {
  const Icon = filled ? IconPinnedFilled : IconPinned;
  return <Icon size={15} stroke={1.8} aria-hidden="true" />;
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
