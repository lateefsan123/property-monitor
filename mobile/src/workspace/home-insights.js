import { supabase } from "../supabase";
import {
  sanitizeChangeItem,
  sanitizeListingHistoryEntry,
} from "../../../src/features/listing-alerts/change-detection";
import { createHomeInsightServices } from "../../../shared/home-insights.js";
export const {
  startOfLocalDay,
  fetchWhatsAppMessageActivity,
  buildDailyMessageSeries,
  fetchListingPriceDrops,
} = createHomeInsightServices(supabase, {
  sanitizeChangeItem,
  sanitizeListingHistoryEntry,
});
