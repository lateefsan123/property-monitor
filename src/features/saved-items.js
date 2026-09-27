import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const EVENT = "repeat:saved-items-change";
const EMPTY = "{}";

function subscribe(listener) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key) {
  try { return window.localStorage.getItem(key) || EMPTY; }
  catch { return EMPTY; }
}

function parse(raw) {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function legacyEntries(kind) {
  const seller = kind === "sellers";
  const prefix = seller ? "seller-signal:seller-" : "listing-alerts:";
  const entries = {};
  const data = seller ? {} : parse(read("listing-alerts:pinned-data"));
  for (const [suffix, field] of [["favorites", "favorite"], ["pinned", "pinned"]]) {
    try {
      const ids = JSON.parse(window.localStorage.getItem(prefix + suffix) || "[]");
      if (!Array.isArray(ids)) continue;
      for (const id of ids) entries[id] = { ...entries[id], [field]: true, payload: data[id]?.payload };
    } catch { /* Leave unreadable legacy data untouched. */ }
  }
  return entries;
}

// Claim legacy browser preferences once; keep the original data intact.
export function useSavedItems(userId, kind) {
  const key = userId ? `repeat:saved:${kind}:${userId}` : null;
  const raw = useSyncExternalStore(subscribe, () => key ? read(key) : EMPTY, () => EMPTY);
  const entries = useMemo(() => parse(raw), [raw]);
  useEffect(() => {
    if (!key) return;
    try {
      const ownerKey = `repeat:saved:legacy-owner:${kind}`;
      const owner = window.localStorage.getItem(ownerKey);
      if (owner && owner !== userId) return;
      window.localStorage.setItem(ownerKey, userId);
      if (window.localStorage.getItem(key) !== null) return;
      window.localStorage.setItem(key, JSON.stringify(legacyEntries(kind)));
      window.dispatchEvent(new Event(EVENT));
    } catch { /* Storage may be disabled. */ }
  }, [key, kind, userId]);
  const toggle = useCallback((id, field, payload) => {
    if (!key) return;
    const next = parse(read(key));
    const entry = next[id] || {};
    next[id] = { ...entry, [field]: !entry[field], payload: payload || entry.payload };
    if (!next[id].favorite && !next[id].pinned) delete next[id];
    try { window.localStorage.setItem(key, JSON.stringify(next)); }
    catch { return; }
    window.dispatchEvent(new Event(EVENT));
  }, [key]);
  const remember = useCallback((items) => {
    if (!key) return;
    const next = parse(read(key));
    let changed = false;
    for (const [id, payload] of items) {
      if (!next[id] || next[id].payload) continue;
      next[id] = { ...next[id], payload };
      changed = true;
    }
    if (!changed) return;
    try { window.localStorage.setItem(key, JSON.stringify(next)); }
    catch { return; }
    window.dispatchEvent(new Event(EVENT));
  }, [key]);
  return { entries, toggle, remember };
}
