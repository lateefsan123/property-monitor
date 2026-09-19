import { supabase } from "../supabase";
import { createSendActivityServices } from "../../../shared/send-activity.js";
export const { fetchWhatsAppSendActivity } =
  createSendActivityServices(supabase);
