import { supabase } from "../../supabase";
import { createSellerStatusServices } from "../../../../shared/seller-statuses.js";

export const { fetchStatuses, saveStatus, renameSellers, deleteStatus } = createSellerStatusServices(supabase);
