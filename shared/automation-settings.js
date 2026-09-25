// Shared by desktop and native. The authenticated client is supplied by each app.
export function createAutomationServices(supabase) {
  async function fetchAutomationSettings(userId) {
    if (!userId) {
      return {
        autoWhatsAppEnabled: true,
        monthlyReportsEnabled: false,
      };
    }

    const { data, error } = await supabase
      .from("seller_signal_automation_settings")
      .select("auto_whatsapp_enabled, monthly_reports_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      autoWhatsAppEnabled: data?.auto_whatsapp_enabled !== false,
      monthlyReportsEnabled: data?.monthly_reports_enabled === true,
    };
  }

  async function saveAutomationSettings(userId, settings) {
    if (!userId) throw new Error("Sign in to change automation settings.");

    const { data, error } = await supabase
      .from("seller_signal_automation_settings")
      .upsert(
        {
          user_id: userId,
          auto_whatsapp_enabled: Boolean(settings.autoWhatsAppEnabled),
          monthly_reports_enabled: Boolean(settings.monthlyReportsEnabled),
        },
        { onConflict: "user_id" },
      )
      .select("auto_whatsapp_enabled, monthly_reports_enabled")
      .single();

    if (error) throw new Error(error.message);

    return {
      autoWhatsAppEnabled: data.auto_whatsapp_enabled !== false,
      monthlyReportsEnabled: data.monthly_reports_enabled === true,
    };
  }

  return { fetchAutomationSettings, saveAutomationSettings };
}
