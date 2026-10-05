import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../../shared/whatsapp-messages.js";
import { fetchSellerThread, sellerThreadQueryKey } from "../../home/message-feed-services";
import "../../../styles/message-history.css";

const RECENT_COUNT = 6;
const timeOf = (value) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Every WhatsApp message with this seller: what you sent (right) and what they
// replied (left), oldest first, grouped by day. Opens on the latest few so the
// newest message and any reply are in view without scrolling.
export default function SellerMessageHistory({ userId, lead }) {
  const [showAll, setShowAll] = useState(false);
  const thread = useQuery({ queryKey: sellerThreadQueryKey(userId, lead.id), enabled: Boolean(userId && lead?.id), queryFn: () => fetchSellerThread(userId, lead) });

  if (thread.isPending) return <p className="message-thread-empty">Loading message history…</p>;
  if (thread.error) return <p className="message-thread-empty is-error">Message history unavailable. <button type="button" className="message-thread-retry" onClick={() => thread.refetch()}>Try again</button></p>;
  if (!thread.data.length) return <p className="message-thread-empty">No WhatsApp messages with {lead.name || "this seller"} yet. Messages you send and their replies will show here.</p>;

  const hidden = showAll ? 0 : Math.max(0, thread.data.length - RECENT_COUNT);
  return <div className="message-thread" aria-label={`Messages with ${lead.name || "this seller"}`}>
    {hidden > 0 && <button type="button" className="message-thread-earlier" onClick={() => setShowAll(true)}>Show {hidden} earlier {hidden === 1 ? "message" : "messages"}</button>}
    {groupFeedByDay(thread.data.slice(hidden)).map((group) => (
      <div key={group.key} className="message-thread-day">
        <h3 className="message-thread-day-title">{group.title}</h3>
        {group.items.map((message) => {
          const inbound = message.direction === "inbound";
          const failed = message.status === "failed";
          const time = timeOf(messageTime(message));
          const meta = inbound ? time : [time, messageSourceLabel(message), messageStatusLabel(message)].filter(Boolean).join(" · ");
          return <div key={message.id} className={`message-thread-item ${inbound ? "is-inbound" : "is-outbound"}`}>
            <p className="message-thread-bubble">{messageText(message)}</p>
            <span className={`message-thread-meta${failed ? " is-failed" : ""}`}>{failed && message.error_message ? `${meta} · ${message.error_message}` : meta}</span>
          </div>;
        })}
      </div>
    ))}
  </div>;
}
