import { integrationRequest } from "./integration-client";
import { integrationStatusOptions } from "./integration-query";
import { buildingScheduleOptions } from "../shared/building-schedule-queries.js";
import { supabase } from "./supabase";
import { fetchUserLeads, fetchWhatsAppAccounts, fetchAutomationSettings, fetchWhatsAppSendActivity, fetchCachedBuildings } from "./features/seller-signal/services";
import { fetchSellerSources } from "./features/seller-signal/page-helpers";
import { fetchBuildingAliases } from "./features/seller-signal/building-alias-services";
import { fetchMessageTemplates } from "./features/seller-signal/message-template-services";
import { fetchListingAlertsFeed } from "./features/listing-alerts/alert-utils";
import { listingStateOptions } from "./features/listing-alerts/listing-state-query";
import { fetchListingPriceDrops, fetchWhatsAppMessageActivity } from "./features/home/home-insight-services";
import * as keys from "./features/seller-signal/queryKeys";

export function pageQueries(userId) {
  const query = (queryKey, queryFn, staleTime = 60_000) => ({ queryKey, queryFn, staleTime });
  const leads = query(keys.sellerLeadsQueryKey(userId), () => fetchUserLeads(userId), 120_000);
  const sources = query(keys.sellerSourcesQueryKey(userId), () => fetchSellerSources(userId));
  const schedule = buildingScheduleOptions(supabase, userId);
  const templates = query(keys.sellerMessageTemplatesQueryKey(userId), () => fetchMessageTemplates(userId));
  const settings = [
    integrationStatusOptions(userId, integrationRequest),
    query(keys.sellerWhatsAppAccountsQueryKey(userId), () => fetchWhatsAppAccounts(userId)),
    query(keys.sellerAutomationSettingsQueryKey(userId), () => fetchAutomationSettings(userId)),
    query(keys.sellerSendActivityQueryKey(userId), () => fetchWhatsAppSendActivity(userId), 30_000),
  ];
  return {
    home: [leads, sources, query(["home", "whatsapp-activity", userId, 14], () => fetchWhatsAppMessageActivity(userId, 14), 5 * 60_000), query(["home", "price-drops", userId], () => fetchListingPriceDrops(userId), 5 * 60_000)],
    sellers: [leads, sources, query(keys.sellerBuildingAliasesQueryKey(userId), () => fetchBuildingAliases(userId)), query(keys.sellerCachedBuildingsQueryKey(), fetchCachedBuildings, 30 * 60_000), templates],
    spreadsheets: [sources, leads],
    schedule: [schedule.schedule, sources, leads],
    "listing-alerts": [listingStateOptions(supabase, userId), query(["listing-alerts-feed"], fetchListingAlertsFeed, 5 * 60_000)],
    "message-template": [templates],
    settings,
  };
}
