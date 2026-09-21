import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SchedulePage from "../../../src/features/schedule/SchedulePage";
import { emptySchedule } from "../../../supabase/functions/_shared/building-schedule";

// Isolated interactive preview: this client never contacts a real account or sends messages.
const initial = emptySchedule();
initial.enabled = true;
Object.assign(initial.days, { Monday: ["Forte 1", "Forte 2", "Burj Khalifa"], Tuesday: ["Boulevard Point", "Burj Vista"], Wednesday: ["The Address Downtown"], Thursday: ["Forte 1", "Burj Vista"], Friday: ["Burj Khalifa"] });
const storageKey = "repeat-schedule-design-preview-v1";
let saved = JSON.parse(localStorage.getItem(storageKey) || "null") || initial;
const names = [...new Set(Object.values(initial.days).flat())].sort();
const client = { from() {
  const query = {
    select: () => query, eq: () => query, not: () => query, order: () => query,
    maybeSingle: async () => ({ data: saved }),
    range: async (start, end) => ({ data: names.map((building, id) => ({ id, building })).slice(start, end + 1) }),
    upsert: async (value) => { saved = value; localStorage.setItem(storageKey, JSON.stringify(saved)); return { error: null }; },
  };
  return query;
} };
const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export function Preview() {
  const [dark, setDark] = useState(false);
  return <div data-theme={dark ? "dark" : "light"} style={{ minHeight: "100vh", background: dark ? "#20201f" : "white", color: dark ? "#eee" : "#222" }}><div style={{ padding: "12px 32px", fontSize: 13, borderBottom: "1px solid #8884", display: "flex", justifyContent: "space-between" }}><span>Interactive preview · Sample buildings · No messages sent</span><button onClick={() => setDark(!dark)}>{dark ? "Light theme" : "Dark theme"}</button></div><SchedulePage userId="preview" client={client} /></div>;
}
const root = import.meta.hot?.data.root || createRoot(document.getElementById("root"));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<QueryClientProvider client={cache}><Preview /></QueryClientProvider>);
