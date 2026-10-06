import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { IconX } from "@tabler/icons-react";
import MessageFeedList, { LoadMore } from "../activity/MessageFeedList";
import { fetchMessagePage, messageFeedQueryKey, nextFeedCursor } from "./message-feed-services";
import SetupNextAction from "./SetupNextAction";

const PREVIEW_COUNT = 4;

// Loads the last 7 days a page at a time only once the modal is open.
function AllMessagesDialog({ userId, onClose, onOpenSeller }) {
  const feed = useInfiniteQuery({
    queryKey: messageFeedQueryKey(userId, "week"),
    queryFn: ({ pageParam }) => fetchMessagePage(userId, { days: 7, cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: nextFeedCursor,
    staleTime: 60 * 1000,
    // Refocusing would refetch every loaded page; sends refresh it instead.
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const items = feed.data?.pages.flatMap((page) => page.items) || [];
  return (
    <div className="home-drops-modal-overlay" role="presentation" onClick={onClose}>
      <div className="home-drops-modal" role="dialog" aria-modal="true" aria-label="Recent messages" onClick={(event) => event.stopPropagation()}>
        <div className="home-drops-modal-head">
          <div><span className="home-muted home-small">Last 7 days</span><h3>Recent messages</h3></div>
          <button type="button" className="home-drops-modal-close" onClick={onClose} aria-label="Close"><IconX size={18} stroke={2} aria-hidden="true" /></button>
        </div>
        <div className="home-drops-modal-body message-feed-modal-body">
          {feed.isPending ? <p className="home-muted message-feed-empty">Loading…</p>
            : feed.error ? <p className="home-muted message-feed-empty">Unavailable. <button type="button" className="home-text-button" onClick={() => feed.refetch()}>Try again</button></p>
              : <>
                <MessageFeedList items={items} onOpenSeller={(id) => { onClose(); onOpenSeller?.(id); }} />
                <LoadMore query={feed} />
              </>}
        </div>
      </div>
    </div>
  );
}

// Right-rail shortcut: the latest few people messaged or who replied, each with
// its exact send time. Show all opens the last 7 days; rows open the seller's history.
export default function HomeMessageShortcut({ userId, onOpenSeller, onNavigate }) {
  const [showAll, setShowAll] = useState(false);
  const latest = useQuery({
    queryKey: messageFeedQueryKey(userId, "latest"),
    enabled: Boolean(userId),
    queryFn: () => fetchMessagePage(userId, { days: 7, pageSize: PREVIEW_COUNT }),
    staleTime: 60 * 1000,
  });
  const items = latest.data?.items || [];
  return (
    <section className="home-card" aria-labelledby="home-messages-title">
      <h2 id="home-messages-title" className="home-card-title">Recent messages</h2>
      {latest.isPending ? <p className="home-muted message-feed-empty">Loading…</p>
        : latest.error ? <p className="home-muted message-feed-empty">Unavailable. <button type="button" className="home-text-button" onClick={() => latest.refetch()}>Try again</button></p>
          : !items.length ? (
            <div className="message-feed-empty">
              <p className="home-muted">No messages in the last 7 days.</p>
              <SetupNextAction userId={userId} onNavigate={onNavigate} showHint={false} />
            </div>
          )
            : <>
              <MessageFeedList items={items} compact onOpenSeller={onOpenSeller} />
              {latest.data.nextCursor && <button type="button" className="home-text-button message-feed-more" onClick={() => setShowAll(true)}>Show all</button>}
            </>}
      {showAll && <AllMessagesDialog userId={userId} onClose={() => setShowAll(false)} onOpenSeller={onOpenSeller} />}
    </section>
  );
}
