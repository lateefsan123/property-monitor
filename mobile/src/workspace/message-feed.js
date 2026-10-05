import { supabase } from "../supabase";
import { createWhatsAppMessageServices } from "../../../shared/whatsapp-messages.js";

export const { fetchMessageFeed, fetchSellerThread } = createWhatsAppMessageServices(supabase);
export const messageFeedQueryKey = (userId) => ["home", "message-feed", userId];
export const activityFeedQueryKey = (userId) => ["activity", "message-feed", userId];
export const sellerThreadQueryKey = (userId, leadId) => ["seller-thread", userId, String(leadId)];
