import { useInfiniteQuery } from "@tanstack/react-query";
import { groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../../shared/whatsapp-messages.js";
import { fetchSellerThreadPage, nextFeedCursor, sellerThreadQueryKey } from "../../home/message-feed-services";
import "../../../styles/message-history.css";

const timeOf = (value) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Every WhatsApp message with this seller: what you sent (right) and what they
// replied (left), oldest first under day dividers. Loads the latest 20; earlier
// messages load a page at a time.
export default function SellerMessageHistory({ userId, lead }) {
  const thread = useInfiniteQuery({
    queryKey: sellerThreadQueryKey(userId, lead.id),
    enabled: Boolean(userId && lead?.id),
    queryFn: ({ pageParam }) => fetchSellerThreadPage(userId, lead, { cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: nextFeedCursor,
  });

  if (thread.isPending) return <p className="message-thread-empty">Loading message history…</p>;
  if (thread.error) return <p className="message-thread-empty is-error">Message history unavailable. <button type="button" className="message-thread-retry" onClick={() => thread.refetch()}>Try again</button></p>;
  // Pages arrive newest first; the thread reads oldest first.
  const messages = thread.data.pages.flatMap((page) => page.items).reverse();
  if (!messages.length) return <p className="message-thread-empty">No WhatsApp messages with {lead.name || "this seller"} yet. Messages you send and their replies will show here.</p>;

  return <div className="message-thread" aria-label={`Messages with ${lead.name || "this seller"}`}>
    {thread.hasNextPage && <button type="button" className="message-thread-earlier" disabled={thread.isFetchingNextPage} onClick={() => thread.fetchNextPage()}>{thread.isFetchingNextPage ? "Loading…" : "Show earlier messages"}</button>}
    {groupFeedByDay(messages).map((group) => (
      <section key={group.key} className="message-thread-day" aria-label={group.title}>
        <h3 className="message-thread-day-title"><span>{group.title}</span></h3>
        {group.items.map((message) => {
          const inbound = message.direction === "inbound";
          const failed = message.status === "failed";
          const sentAt = messageTime(message);
          const time = timeOf(sentAt);
          const meta = inbound ? time : [time, messageSourceLabel(message), messageStatusLabel(message)].filter(Boolean).join(" · ");
          return <div key={message.id} className={`message-thread-item ${inbound ? "is-inbound" : "is-outbound"}`}>
            <p className="message-thread-bubble">{messageText(message)}</p>
            <time className={`message-thread-meta${failed ? " is-failed" : ""}`} dateTime={sentAt} title={new Date(sentAt).toLocaleString("en-GB")}>{failed && message.error_message ? `${meta} · ${message.error_message}` : meta}</time>
          </div>;
        })}
      </section>
    ))}
  </div>;
}
