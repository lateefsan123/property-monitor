import { formatBuildingLabel } from "../seller-signal/building-utils";
import { groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../shared/whatsapp-messages.js";
import "../../styles/message-history.css";

const timeOf = (value) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function feedRowParts(item) {
  const lead = item.lead;
  const inbound = item.direction === "inbound";
  return {
    lead,
    inbound,
    name: lead?.name || `+${item.recipient_phone}`,
    place: lead ? [formatBuildingLabel(lead.building) || lead.building, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean).join(" · ") : "Not in your sellers",
    detail: inbound ? `Replied: ${messageText(item)}` : [messageSourceLabel(item), messageStatusLabel(item)].filter(Boolean).join(" · "),
    time: timeOf(messageTime(item)),
  };
}

function FeedRow({ item, compact, onOpenSeller }) {
  const { lead, inbound, name, place, detail, time } = feedRowParts(item);
  const content = <>
    <span className="message-feed-text">
      <strong>{name}</strong>
      {!compact && <span className="message-feed-place">{place}</span>}
      <span className={`message-feed-detail${item.status === "failed" ? " is-failed" : inbound ? " is-reply" : ""}`}>{detail}</span>
    </span>
    <time className="message-feed-time" dateTime={messageTime(item)}>{time}</time>
  </>;
  return lead
    ? <button type="button" className="message-feed-row" onClick={() => onOpenSeller?.(lead.id)} aria-label={`${inbound ? "Reply from" : "Message to"} ${name}, ${time}. Open messages`}>{content}</button>
    : <div className="message-feed-row is-static">{content}</div>;
}

// Rows of who was messaged (and who replied). Grouped by day unless compact.
export default function MessageFeedList({ items, compact = false, onOpenSeller }) {
  if (compact) {
    return <ul className="message-feed-list is-compact">{items.map((item) => <li key={item.id}><FeedRow item={item} compact onOpenSeller={onOpenSeller} /></li>)}</ul>;
  }
  return groupFeedByDay(items).map((group) => (
    <div key={group.key} className="message-feed-day">
      <h3 className="message-feed-day-title">{group.title}</h3>
      <ul className="message-feed-list">{group.items.map((item) => <li key={item.id}><FeedRow item={item} onOpenSeller={onOpenSeller} /></li>)}</ul>
    </div>
  ));
}
