import { useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconPinned,
  IconPinnedFilled,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import { formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../building-utils";
import { extractUnitFromBuilding, formatLeadBedroom, formatLeadUnit } from "./lead-display-utils";
import StatusPill from "./SellerStatusPill";
import { sellerAvatarColour as avatarColour, sellerInitials as initials, sellerStatusTone as statusTone } from "./seller-avatar";

// One seller row in the Deel-style table, one value per column: initials
// avatar and name, building, unit, bedrooms, status and follow-up pills,
// copyable phone, send, and a menu.
export default function LeadCard({
  automationAccount = false,
  copiedLeadId,
  favorited,
  hot,
  insight,
  isSent,
  lead,
  onCopyMessage,
  onDelete,
  onSendWhatsApp,
  onToggleExpanded,
  onToggleFavorite,
  onTogglePin,
  onHandoff,
  pinned,
  whatsappConnected,
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const copyTimer = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  async function copyPhone(event) {
    event.stopPropagation();
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(String(lead.phone));
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Could not copy. Try again.");
    }
    copyTimer.current = setTimeout(() => setCopyStatus(""), 2500);
  }

  const name = lead.name || "Unnamed";
  const message = lead.message_draft ?? insight?.message ?? null;
  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);
  const building = insight?.locationName || formatBuildingLabel(lead.resolvedBuilding || lead.building) || lead.resolvedBuilding || lead.building || "-";
  const buildingTitle = lead.resolvedBuilding && lead.resolvedBuilding !== lead.building ? `${building} (from ${lead.building})` : building;
  const bedroomLabel = formatLeadBedroom(lead.bedroom);
  const unitLabel = formatLeadUnit(lead.unit || extractUnitFromBuilding(lead.building));
  const whatsappUrl = whatsappPhone ? `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(message || "")}` : null;

  // Hot leads send today's transaction; other leads with market data send a
  // recent-market follow-up; without data there is nothing to send one-click.
  const hasTodaySale = insight?.status === "ready" && (insight.hasTodaysTransactions || insight.todaysRecentTransactions?.length > 0);
  const canFollowUp = insight?.status === "ready" && (insight.recentTransactions?.length || 0) > 0;
  const hasSavedMessage = automationAccount || Boolean(lead.message_draft?.trim());
  const insightPending = !insight || insight.status === "loading";
  const sendLabel = isSent ? "Sent" : hasSavedMessage || insightPending || hasTodaySale ? "Send" : canFollowUp ? "Follow up" : "No data";
  const stop = (event) => event.stopPropagation();

  const sendButton = whatsappPhone && whatsappConnected ? (
    <button type="button" className="seller-send-btn" aria-label={`${sendLabel} WhatsApp to ${name}`}
      disabled={!isSent && !hasSavedMessage && (insightPending || (!hasTodaySale && !canFollowUp))}
      title={sendLabel === "No data" ? "No market data for this building yet" : undefined}
      onClick={(event) => { stop(event); void onSendWhatsApp?.(lead.id); }}>
      {isSent ? <IconCheck size={16} stroke={2} aria-hidden="true" /> : <IconBrandWhatsapp size={16} stroke={2} aria-hidden="true" />}{sendLabel}
    </button>
  ) : whatsappUrl ? (
    <a className="seller-send-btn" href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => { stop(event); onHandoff?.(lead.id); }}>
      {isSent ? <IconCheck size={16} stroke={2} aria-hidden="true" /> : <IconBrandWhatsapp size={16} stroke={2} aria-hidden="true" />}
      {isSent ? "Sent" : hasTodaySale || insightPending ? "Send" : "Follow up"}
    </a>
  ) : (
    <button type="button" className="seller-send-btn is-muted" onClick={(event) => { stop(event); if (message) void onCopyMessage(lead.id, message); onHandoff?.(lead.id); }}>
      {copiedLeadId === lead.id ? <IconCheck size={16} stroke={2} aria-hidden="true" /> : <IconCopy size={16} stroke={2} aria-hidden="true" />}
      {isSent ? "Sent" : copiedLeadId === lead.id ? "Copied" : "Copy message"}
    </button>
  );

  return (
    <tr
      className={`seller-row${isSent ? " is-sent" : ""}${pinned ? " is-pinned" : ""}`}
      onClick={() => onToggleExpanded(lead.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggleExpanded(lead.id); }
      }}
      tabIndex={0}
      aria-label={`Open seller ${name}`}
    >
      <td>
        <div className="seller-person">
          <span className="seller-avatar" style={{ background: avatarColour(lead.id || name) }} aria-hidden="true">{initials(name)}</span>
          <span className="seller-person-name">
            <span className="seller-name" title={name}>{name}</span>
            {pinned && <IconPinnedFilled className="seller-flag" size={13} aria-label="Pinned" />}
            {favorited && <IconStarFilled className="seller-flag is-star" size={13} aria-label="Favourite" />}
            {lead.dataQuality?.level === "review" && (
              <span className="seller-flag is-review" role="img" aria-label="Needs review" title={lead.dataQuality.issues?.map((issue) => issue.label).join(", ") || "Needs review"}>
                <IconAlertTriangle size={14} stroke={2} aria-hidden="true" />
              </span>
            )}
          </span>
        </div>
      </td>
      {!automationAccount && <><td><span className="seller-building" title={buildingTitle}>{building}</span></td>
      <td className="seller-unit">{unitLabel || <span className="seller-none">—</span>}</td>
      <td className="seller-unit">{bedroomLabel || <span className="seller-none">—</span>}</td></>}
      <td><StatusPill tone={statusTone(lead.statusRule?.id)} color={lead.statusRule?.color}>{lead.statusLabel}</StatusPill></td>
      <td>
        {hot ? <StatusPill tone="red">Sold today</StatusPill>
          : lead.dueLabel ? <StatusPill tone={lead.isDue ? "red" : "green"}>{lead.dueLabel}</StatusPill>
            : <span className="seller-none">—</span>}
      </td>
      <td>
        {lead.phone ? (
          <button type="button" className="seller-phone" aria-label={`Copy phone number for ${name}`} onClick={copyPhone}>
            <span>{lead.phone}</span>
            {copyStatus === "Copied" ? <IconCheck size={14} stroke={1.8} aria-hidden="true" /> : <IconCopy size={14} stroke={1.8} aria-hidden="true" />}
            <span className="seller-copy-status" role="status">{copyStatus}</span>
          </button>
        ) : <span className="seller-none">—</span>}
      </td>
      <td onClick={stop}>{sendButton}</td>
      <td className="seller-menu-cell" onClick={stop}>
        <div className="seller-menu-wrap" ref={menuRef}>
          <button type="button" className="seller-menu-btn" aria-label={`More actions for ${name}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            <IconDotsVertical size={18} stroke={2} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="seller-pill-menu is-end" role="menu">
              {onTogglePin && <button type="button" role="menuitem" className="seller-pill-option" onClick={() => { onTogglePin(lead.id); setMenuOpen(false); }}>{pinned ? <IconPinned size={15} stroke={1.8} aria-hidden="true" /> : <IconPinnedFilled size={15} aria-hidden="true" />}<span>{pinned ? "Unpin" : "Pin to top"}</span></button>}
              {onToggleFavorite && <button type="button" role="menuitem" className="seller-pill-option" onClick={() => { onToggleFavorite(lead.id); setMenuOpen(false); }}><IconStarFilled size={15} aria-hidden="true" /><span>{favorited ? "Remove favourite" : "Add to favourites"}</span></button>}
              {onDelete && <button type="button" role="menuitem" className="seller-pill-option is-danger" onClick={() => { setMenuOpen(false); if (window.confirm(`Delete "${name}"?`)) onDelete(lead.id); }}><IconTrash size={15} stroke={1.8} aria-hidden="true" /><span>Delete seller</span></button>}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
