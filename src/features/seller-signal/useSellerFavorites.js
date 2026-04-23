import { useCallback, useEffect, useState } from "react";

const FAVORITES_KEY = "seller-signal:seller-favorites";
const PINNED_KEY = "seller-signal:seller-pinned";
const FAVORITES_EVENT = "seller-signal:seller-favorites-change";
const PINNED_EVENT = "seller-signal:seller-pinned-change";

function loadIdSet(key) {
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

function saveIdSet(key, event, set) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event(event));
  } catch {
    /* ignore */
  }
}

function useSyncedIdSet(storageKey, changeEvent) {
  const [ids, setIds] = useState(() => loadIdSet(storageKey));

  useEffect(() => {
    function sync() {
      setIds(loadIdSet(storageKey));
    }
    function onStorage(event) {
      if (event.key === storageKey) sync();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(changeEvent, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(changeEvent, sync);
    };
  }, [storageKey, changeEvent]);

  const toggle = useCallback(
    (id) => {
      const key = String(id);
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        saveIdSet(storageKey, changeEvent, next);
        return next;
      });
    },
    [storageKey, changeEvent],
  );

  const setMany = useCallback(
    (targetIds, value) => {
      setIds((prev) => {
        const next = new Set(prev);
        for (const id of targetIds) {
          const k = String(id);
          if (value) next.add(k);
          else next.delete(k);
        }
        saveIdSet(storageKey, changeEvent, next);
        return next;
      });
    },
    [storageKey, changeEvent],
  );

  return { ids, toggle, setMany };
}

export function useSellerFavorites() {
  const favorites = useSyncedIdSet(FAVORITES_KEY, FAVORITES_EVENT);
  const pinned = useSyncedIdSet(PINNED_KEY, PINNED_EVENT);
  return {
    favoriteIds: favorites.ids,
    toggleFavorite: favorites.toggle,
    pinnedIds: pinned.ids,
    togglePin: pinned.toggle,
    setManyPinned: pinned.setMany,
  };
}
