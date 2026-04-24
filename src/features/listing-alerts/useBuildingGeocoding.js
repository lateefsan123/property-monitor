import { useEffect, useRef, useState } from "react";

const CACHE_KEY = "building-geocodes-v1";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const RATE_LIMIT_MS = 1100;

function loadCache() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
}

async function geocodeBuilding(building, signal) {
  const parts = [building.buildingName, building.fullPath?.split("|").slice(-2, -1)[0]?.trim(), "Dubai", "UAE"]
    .filter(Boolean);
  const query = parts.join(", ");
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ae`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`geocode ${response.status}`);
  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first || !first.lat || !first.lon) return null;
  return { lat: Number(first.lat), lng: Number(first.lon) };
}

export function useBuildingGeocoding(buildings) {
  const [coords, setCoords] = useState(loadCache);
  const [pending, setPending] = useState(0);
  const queueRef = useRef(null);

  useEffect(() => {
    if (!buildings?.length) return undefined;

    const cache = { ...coords };
    const missing = buildings.filter((building) => building?.locationId && cache[building.locationId] == null);
    if (!missing.length) return undefined;

    const controller = new AbortController();
    let cancelled = false;
    setPending(missing.length);

    async function run() {
      for (const building of missing) {
        if (cancelled) return;
        try {
          const result = await geocodeBuilding(building, controller.signal);
          cache[building.locationId] = result || { failed: true };
        } catch {
          if (controller.signal.aborted) return;
          cache[building.locationId] = { failed: true };
        }
        if (cancelled) return;
        saveCache(cache);
        setCoords({ ...cache });
        setPending((current) => Math.max(0, current - 1));
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, RATE_LIMIT_MS);
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    }

    queueRef.current = run();
    void queueRef.current;

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  return { coords, pending };
}
