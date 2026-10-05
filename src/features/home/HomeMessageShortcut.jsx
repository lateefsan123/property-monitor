import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconX } from "@tabler/icons-react";
import MessageFeedList from "../activity/MessageFeedList";
import { fetchMessageFeed, messageFeedQueryKey } from "./message-feed-services";

const PREVIEW_COUNT = 4;

function AllMessagesDialog({ items, onClose, onOpenSeller }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="home-drops-modal-overlay" role="presentation" onClick={onClose}>
      <div className="home-drops-modal" role="dialog" aria-modal="true" aria-label="Recent messages" onClick={(event) => event.stopPropagation()}>
        <div className="home-drops-modal-head">
          <div><span className="home-muted home-small">Last 7 days</span><h3>{items.length} message{items.length === 1 ? "" : "s"}</h3></div>
          <button type="button" className="home-drops-modal-close" onClick={onClose} aria-label="Close"><IconX size={18} stroke={2} aria-hidden="true" /></button>
        </div>
        <div className="home-drops-modal-body message-feed-modal-body"><MessageFeedList items={items} onOpenSeller={(id) => { onClose(); onOpenSeller?.(id); }} /></div>
      </div>
    </div>
  );
}

// Right-rail shortcut: the latest few people messaged or who replied. Show all
// opens every message from the last 7 days; rows open the seller's history.
export default function HomeMessageShortcut({ userId, onOpenSeller }) {
  const [showAll, setShowAll] = useState(false);
  const feed = useQuery({ queryKey: messageFeedQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchMessageFeed(userId), staleTime: 60 * 1000 });
  const items = feed.data || [];
  return (
    <section className="home-card" aria-labelledby="home-messages-title">
      <h2 id="home-messages-title" className="home-card-title">Recent messages</h2>
      {feed.isPending ? <p className="home-muted message-feed-empty">Loading…</p>
        : feed.error ? <p className="home-muted message-feed-empty">Unavailable. <button type="button" className="home-text-button" onClick={() => feed.refetch()}>Try again</button></p>
          : !items.length ? <p className="home-muted message-feed-empty">No messages in the last 7 days.</p>
            : <>
              <MessageFeedList items={items.slice(0, PREVIEW_COUNT)} compact onOpenSeller={onOpenSeller} />
              {items.length > PREVIEW_COUNT && <button type="button" className="home-text-button message-feed-more" onClick={() => setShowAll(true)}>Show all</button>}
            </>}
      {showAll && <AllMessagesDialog items={items} onClose={() => setShowAll(false)} onOpenSeller={onOpenSeller} />}
    </section>
  );
}
