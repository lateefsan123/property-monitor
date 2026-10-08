import { supabase } from "../supabase";
import { createWhatsAppMessageServices, latestPerSeller } from "../../../shared/whatsapp-messages.js";

export { latestPerSeller };

export const { fetchMessagePage, fetchRecentPeople, fetchSellerThreadPage } = createWhatsAppMessageServices(supabase);
export const messageFeedQueryKey = (userId, scope) => ["message-feed", userId, scope];
export const sellerThreadQueryKey = (userId, leadId) => ["seller-thread", userId, String(leadId)];
// Shared by react-query's infinite queries: the cursor of the last page.
export const nextFeedCursor = (lastPage) => lastPage.nextCursor ?? undefined;
