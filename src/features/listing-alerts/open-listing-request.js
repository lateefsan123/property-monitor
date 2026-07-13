import { useEffect, useRef } from "react";

// Cross-page deep link into a specific listing's detail view, mirroring the
// requestOpenSpreadsheet pattern: works whether or not the listing-alerts
// page is currently mounted.
const PENDING_OPEN_KEY = "listing-alerts:open-listing";
const OPEN_REQUEST_EVENT = "listing-alerts:open-listing-request";

export function requestOpenListing(listingKey) {
  if (typeof window === "undefined" || !listingKey) return;
  try {
    window.sessionStorage.setItem(PENDING_OPEN_KEY, String(listingKey));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(OPEN_REQUEST_EVENT, { detail: String(listingKey) }));
}

export function consumePendingOpenListing() {
  if (typeof window === "undefined") return null;
  try {
    const key = window.sessionStorage.getItem(PENDING_OPEN_KEY);
    if (key) window.sessionStorage.removeItem(PENDING_OPEN_KEY);
    return key || null;
  } catch {
    return null;
  }
}

export function useOpenListingRequests(handler) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  useEffect(() => {
    function onRequest(event) {
      const key = event?.detail;
      if (key) handlerRef.current(String(key));
    }
    window.addEventListener(OPEN_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(OPEN_REQUEST_EVENT, onRequest);
  }, []);
}
