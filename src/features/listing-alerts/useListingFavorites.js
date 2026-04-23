import { useCallback, useEffect, useRef, useState } from "react";

const FAV_KEY = "listing-alerts:favorites";
const PIN_KEY = "listing-alerts:pinned";
const PIN_DATA_KEY = "listing-alerts:pinned-data";
const CHANGE_EVENT = "listing-alerts:favorites-change";

const PENDING_OPEN_KEY = "listing-alerts:pending-open";
const OPEN_REQUEST_EVENT = "listing-alerts:open-request";

function loadSet(key) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

function loadPinData() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PIN_DATA_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function savePinData(data) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIN_DATA_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function dispatchChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useListingFavorites() {
  const [favorites, setFavorites] = useState(() => loadSet(FAV_KEY));
  const [pinned, setPinned] = useState(() => loadSet(PIN_KEY));

  useEffect(() => {
    function sync() {
      setFavorites(loadSet(FAV_KEY));
      setPinned(loadSet(PIN_KEY));
    }
    function onStorage(event) {
      if (event.key === FAV_KEY || event.key === PIN_KEY || event.key === PIN_DATA_KEY) sync();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const toggleFavorite = useCallback((id) => {
    const key = String(id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveSet(FAV_KEY, next);
      dispatchChange();
      return next;
    });
  }, []);

  const togglePin = useCallback((id, payload) => {
    const key = String(id);
    setPinned((prev) => {
      const next = new Set(prev);
      const data = loadPinData();
      if (next.has(key)) {
        next.delete(key);
        delete data[key];
      } else {
        next.add(key);
        if (payload) {
          const kind = key.startsWith("l:") ? "listing" : key.startsWith("b:") ? "building" : null;
          data[key] = { kind, savedAt: Date.now(), payload };
        }
      }
      saveSet(PIN_KEY, next);
      savePinData(data);
      dispatchChange();
      return next;
    });
  }, []);

  return { favorites, pinned, toggleFavorite, togglePin };
}

function loadPinnedItems() {
  const keys = Array.from(loadSet(PIN_KEY));
  const data = loadPinData();
  return keys
    .map((key) => {
      const entry = data[key];
      if (!entry || !entry.payload) return null;
      const kind = entry.kind || (key.startsWith("l:") ? "listing" : key.startsWith("b:") ? "building" : null);
      if (!kind) return null;
      return { key, kind, savedAt: entry.savedAt || 0, payload: entry.payload };
    })
    .filter(Boolean);
}

export function usePinnedListingItems() {
  const [items, setItems] = useState(loadPinnedItems);

  useEffect(() => {
    function sync() {
      setItems(loadPinnedItems());
    }
    function onStorage(event) {
      if (event.key === PIN_KEY || event.key === PIN_DATA_KEY) sync();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  return items;
}

export function unpinListingKey(key) {
  if (typeof window === "undefined" || !key) return;
  const set = loadSet(PIN_KEY);
  if (!set.has(key)) return;
  set.delete(key);
  const data = loadPinData();
  delete data[key];
  saveSet(PIN_KEY, set);
  savePinData(data);
  dispatchChange();
}

export function requestOpenPinnedListing(entry) {
  if (typeof window === "undefined" || !entry) return;
  try {
    window.sessionStorage.setItem(PENDING_OPEN_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(OPEN_REQUEST_EVENT, { detail: entry }));
}

export function consumePendingOpenPinnedListing() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_OPEN_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_OPEN_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useOpenPinnedListingRequests(handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    function onRequest(event) {
      if (event?.detail) handlerRef.current(event.detail);
    }
    window.addEventListener(OPEN_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(OPEN_REQUEST_EVENT, onRequest);
  }, []);
}
