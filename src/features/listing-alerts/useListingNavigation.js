import { useCallback, useEffect, useState } from "react";
import { readListingNavigation, writeListingNavigation } from "./listing-navigation";

export function useListingNavigation(initialListingKey) {
  const [selection, setSelection] = useState(() => initialListingKey
    ? { buildingId: initialListingKey.split(":")[0] || null, listingKey: initialListingKey }
    : readListingNavigation(typeof window === "undefined" ? null : window.history.state));

  useEffect(() => {
    // Save an initial cross-page request so Forward and refresh restore it too.
    if (initialListingKey) {
      writeListingNavigation(window.history, {
        buildingId: initialListingKey.split(":")[0] || null,
        listingKey: initialListingKey,
      }, { replace: true });
    }
    function restore() {
      if (window.location.hash === "#/listing-alerts") {
        setSelection(readListingNavigation(window.history.state));
      }
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [initialListingKey]);

  const navigate = useCallback((buildingId = null, listingKey = null) => {
    const next = { buildingId, listingKey };
    writeListingNavigation(window.history, next);
    setSelection(next);
  }, []);

  return { selectedBuildingId: selection.buildingId, selectedListingKey: selection.listingKey, navigate };
}
