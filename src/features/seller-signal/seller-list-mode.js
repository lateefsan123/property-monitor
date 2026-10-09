import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../supabase";

const OVERRIDE_KEY = "seller-signal:list-mode";

function readOverride() {
  try {
    const value = window.localStorage.getItem(OVERRIDE_KEY);
    return value === "server" || value === "client" ? value : null;
  } catch {
    return null;
  }
}

export const sellerListModeQueryKey = (userId) => ["seller-signal", "list-mode", userId];

// The account's own row wins over the default row; "client" if unreadable.
export async function fetchSellerListMode(userId) {
  const { data, error } = await supabase.from("seller_list_modes").select("user_id, mode");
  if (error) return "client";
  const own = (data || []).find((row) => row.user_id === userId);
  const fallback = (data || []).find((row) => !row.user_id);
  return readOverride() || own?.mode || fallback?.mode || "client";
}

// Which seller list this account uses (seller_list_modes): "server" pages
// sellers from the database, "client" loads them all in the browser. The
// account's own row wins over the default row. If the server list fails, the
// page falls back to "client" for the rest of the visit.
export function useSellerListMode(userId) {
  const [failed, setFailed] = useState(false);
  const modeQuery = useQuery({
    queryKey: sellerListModeQueryKey(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchSellerListMode(userId),
  });
  const override = readOverride();
  const resolved = override || modeQuery.data || null;
  return {
    // null while the setting loads, so neither list starts too early.
    mode: failed ? "client" : resolved,
    fallBack: () => setFailed(true),
  };
}
