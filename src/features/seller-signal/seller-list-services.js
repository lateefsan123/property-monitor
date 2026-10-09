import { supabase } from "../../supabase";
import { startOfDay } from "./lead-utils";
import { toLead } from "./seller-list-rows";
import { ensureAccountStatuses } from "./status-registry";
import { fetchStatuses } from "./seller-status-services";
import { getTodayTransactionDateKey } from "./insight-utils";
import { readPage } from "../../../shared/select-counted-rows.js";

const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const timeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dubai"; } catch { return "Asia/Dubai"; }
};

// The day the browser would use: local today for who's due, Dubai today for
// "sold today". Part of the query key, so lists refresh after midnight.
export function sellerListDay() {
  const today = startOfDay(new Date());
  return { today, todayKey: localDateKey(today), hotDate: getTodayTransactionDateKey(), timeZone: timeZone() };
}

export async function fetchSellerListPage(userId, params, signal) {
  await ensureAccountStatuses(userId, fetchStatuses);
  const day = sellerListDay();
  const result = await readPage(() => {
    let request = supabase.rpc("seller_list_page", {
      p_view: params.view,
      p_source: params.source,
      p_status_ids: params.statusIds,
      p_building_keys: params.buildingKeys,
      p_data_filter: params.dataFilter,
      p_quality_filter: params.qualityFilter,
      p_search: params.search,
      p_sort_field: params.sortField,
      p_sort_dir: params.sortDir,
      p_page: params.page,
      p_page_size: params.pageSize,
      p_time_zone: day.timeZone,
      p_today: day.todayKey,
      p_hot_date: day.hotDate,
      p_lead_ids: params.leadIds || null,
      p_with_building_options: Boolean(params.withBuildingOptions),
    });
    if (signal) request = request.abortSignal(signal);
    return request;
  }, 2);
  if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code });
  const data = result.data || {};
  const rows = data.rows || [];
  const leads = rows.map((row, index) => toLead(row, index, day.today, userId));
  const sentMap = {};
  const hotLeadIds = new Set();
  for (const row of rows) {
    if (row.sent_marker_at) sentMap[row.id] = new Date(row.sent_marker_at).getTime();
    if (row.is_hot) hotLeadIds.add(row.id);
  }
  return {
    leads,
    sentMap,
    hotLeadIds,
    total: data.total || 0,
    totalPages: data.total_pages || 1,
    safePage: data.safe_page || 1,
    counts: data.counts || {},
    quality: data.quality || {},
    buildingOptions: (data.building_options || []).map((option) => ({ key: option.key, label: option.label, count: Number(option.count) })),
  };
}

// Sellers per building name in a spreadsheet, for the "Which building?" card.
export async function fetchSellerBuildingCounts(source) {
  const { data, error } = await supabase.rpc("seller_list_building_counts", { p_source: source || "all" });
  if (error) throw new Error(error.message);
  return data || [];
}
