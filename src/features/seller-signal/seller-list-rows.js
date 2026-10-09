import { isAutomationAccount } from "../../../supabase/functions/_shared/automation-account.js";
import { mapStoredLeadRow } from "./lead-utils";
import { withDataQuality } from "./lead-data-quality";
import { parseBuildingAddressValue } from "./building-utils";

// A seller_list_page row as the Sellers page's lead object: the same mapping
// as the full list, plus the building match and duplicate count from the DB.
export function toLead(row, index, today, userId) {
  const lead = mapStoredLeadRow(row, index, today);
  const match = row.match && typeof row.match === "object" && row.match.status
    ? row.match
    : { status: String(row.building || "").trim() ? "unmatched" : "missing" };
  const duplicate = Number(row.dup_count) >= 2 ? { key: null, count: Number(row.dup_count), ids: [] } : null;
  const withQuality = withDataQuality(lead, match, parseBuildingAddressValue(row.building || ""), duplicate, !isAutomationAccount(userId));
  return { ...withQuality, resolvedBuilding: row.resolved_building || withQuality.resolvedBuilding };
}
