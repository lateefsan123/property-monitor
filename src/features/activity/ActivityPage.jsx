import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import MessageFeedList, { LoadMore } from "./MessageFeedList";
import { fetchMessagePage, messageFeedQueryKey, nextFeedCursor } from "../home/message-feed-services";
import "../../styles/activity-page.css";

const FILTERS = [["all", "All", undefined], ["sent", "Sent", "outbound"], ["replies", "Replies", "inbound"]];

// Everyone messaged and every reply from the last 30 days, 30 at a time.
// Filters run in the database; rows open the seller on their message history.
export default function ActivityPage({ userId, onOpenSeller }) {
  const [filter, setFilter] = useState("all");
  const direction = FILTERS.find(([id]) => id === filter)[2];
  const feed = useInfiniteQuery({
    queryKey: messageFeedQueryKey(userId, `month:${filter}`),
    enabled: Boolean(userId),
    queryFn: ({ pageParam }) => fetchMessagePage(userId, { days: 30, direction, cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: nextFeedCursor,
    staleTime: 60 * 1000,
  });
  const items = feed.data?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="activity-page">
      <header className="activity-head">
        <p className="activity-sub">Who you messaged and who replied, last 30 days.</p>
        <div className="activity-filters" role="tablist" aria-label="Filter activity">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={`activity-filter${filter === id ? " is-active" : ""}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </header>
      <section className="activity-card" aria-busy={feed.isPending}>
        {feed.isPending ? <p className="activity-empty">Loading activity…</p>
          : feed.error ? <p className="activity-empty">Activity unavailable. <button type="button" className="home-text-button" onClick={() => feed.refetch()}>Try again</button></p>
            : !items.length ? <p className="activity-empty">{filter === "replies" ? "No replies in the last 30 days." : "No messages in the last 30 days."}</p>
              : <>
                <MessageFeedList items={items} onOpenSeller={onOpenSeller} />
                <LoadMore query={feed} />
              </>}
      </section>
    </div>
  );
}
