import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLeadSources } from "./services";

const STORAGE_KEY = "seller-signal:sheet-favorites";
const CHANGE_EVENT = "seller-signal:favorites-change";

function loadFavoriteIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveFavoriteIds(set) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function useSpreadsheetFavorites(userId) {
  const [favoriteIds, setFavoriteIds] = useState(loadFavoriteIds);

  useEffect(() => {
    function sync() {
      setFavoriteIds(loadFavoriteIds());
    }
    function onStorage(event) {
      if (event.key === STORAGE_KEY) sync();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const toggle = useCallback((id) => {
    const key = String(id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveFavoriteIds(next);
      return next;
    });
  }, []);

  const sourcesQuery = useQuery({
    queryKey: ["seller-signal", "sources", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchLeadSources(userId),
    staleTime: 60 * 1000,
  });

  const favoritedSources = useMemo(() => {
    const all = sourcesQuery.data || [];
    return all.filter((source) => favoriteIds.has(String(source.id)));
  }, [sourcesQuery.data, favoriteIds]);

  return { favoriteIds, toggle, favoritedSources };
}

const PENDING_OPEN_KEY = "seller-signal:open-source";
const OPEN_REQUEST_EVENT = "seller-signal:open-source-request";

export function requestOpenSpreadsheet(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    window.sessionStorage.setItem(PENDING_OPEN_KEY, String(id));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(OPEN_REQUEST_EVENT, { detail: String(id) }));
}

export function consumePendingOpenSpreadsheet() {
  if (typeof window === "undefined") return null;
  try {
    const id = window.sessionStorage.getItem(PENDING_OPEN_KEY);
    if (id) window.sessionStorage.removeItem(PENDING_OPEN_KEY);
    return id || null;
  } catch {
    return null;
  }
}

export function useOpenSpreadsheetRequests(handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    function onRequest(event) {
      const id = event?.detail;
      if (id) handlerRef.current(String(id));
    }
    window.addEventListener(OPEN_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(OPEN_REQUEST_EVENT, onRequest);
  }, []);
}
