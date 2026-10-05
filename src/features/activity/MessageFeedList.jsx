import { formatBuildingLabel } from "../seller-signal/building-utils";
import { formatMessageWhen, groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../shared/whatsapp-messages.js";
import "../../styles/message-history.css";

function FeedRow({ item, compact, onOpenSeller }) {
  const lead = item.lead;
  const inbound = item.direction === "inbound";
  const name = lead?.name || `+${item.recipient_phone}`;
  const place = lead ? [formatBuildingLabel(lead.building) || lead.building, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean).join(" · ") : "Not in your sellers";
  const detail = inbound ? `Replied: ${messageText(item)}` : [messageSourceLabel(item), messageStatusLabel(item)].filter(Boolean).join(" · ");
  const sentAt = messageTime(item);
  // Every row shows the date and time it was sent ("5 Oct · 10:35").
  const when = formatMessageWhen(sentAt);
  const content = <>
    <span className="message-feed-text">
      <strong>{name}</strong>
      {!compact && <span className="message-feed-place">{place}</span>}
      <span className={`message-feed-detail${item.status === "failed" ? " is-failed" : inbound ? " is-reply" : ""}`}>{detail}</span>
    </span>
    <time className="message-feed-time" dateTime={sentAt} title={new Date(sentAt).toLocaleString("en-GB")}>{when}</time>
  </>;
  return lead
    ? <button type="button" className="message-feed-row" onClick={() => onOpenSeller?.(lead.id)} aria-label={`${inbound ? "Reply from" : "Message to"} ${name}, ${formatMessageWhen(sentAt)}. Open messages`}>{content}</button>
    : <div className="message-feed-row is-static">{content}</div>;
}

// Rows of who was messaged (and who replied). Grouped under day dividers unless compact.
export default function MessageFeedList({ items, compact = false, onOpenSeller }) {
  if (compact) {
    return <ul className="message-feed-list is-compact">{items.map((item) => <li key={item.id}><FeedRow item={item} compact onOpenSeller={onOpenSeller} /></li>)}</ul>;
  }
  return groupFeedByDay(items).map((group) => (
    <section key={group.key} className="message-feed-day" aria-label={group.title}>
      <h3 className="message-feed-day-title">{group.title}</h3>
      <ul className="message-feed-list">{group.items.map((item) => <li key={item.id}><FeedRow item={item} onOpenSeller={onOpenSeller} /></li>)}</ul>
    </section>
  ));
}

// "Load more" for paged lists; hidden once every page is loaded.
export function LoadMore({ query }) {
  if (!query.hasNextPage) return null;
  return <button type="button" className="message-feed-load-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
    {query.isFetchingNextPage ? "Loading…" : "Load more"}
  </button>;
}
