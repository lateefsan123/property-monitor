import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MessageFeedList from "./MessageFeedList";
import { activityFeedQueryKey, fetchMessageFeed } from "../home/message-feed-services";
import "../../styles/activity-page.css";

const FILTERS = [["all", "All"], ["sent", "Sent"], ["replies", "Replies"]];

// Everyone messaged and every reply from the last 30 days. Rows open the
// seller on their message history, next to their notes.
export default function ActivityPage({ userId, onOpenSeller }) {
  const [filter, setFilter] = useState("all");
  const feed = useQuery({ queryKey: activityFeedQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchMessageFeed(userId, { days: 30, limit: 2000 }), staleTime: 60 * 1000 });
  const items = (feed.data || []).filter((item) => filter === "all" || (filter === "replies") === (item.direction === "inbound"));

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
              : <MessageFeedList items={items} onOpenSeller={onOpenSeller} />}
      </section>
    </div>
  );
}
