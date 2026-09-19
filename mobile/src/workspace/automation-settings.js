import { supabase } from "../supabase";
import { createAutomationServices } from "../../../shared/automation-settings.js";
export const { fetchAutomationSettings, saveAutomationSettings } =
  createAutomationServices(supabase);
