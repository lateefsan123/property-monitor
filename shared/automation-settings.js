// Shared by desktop and native. The authenticated client is supplied by each app.
// monthlyReportDailyShare: how many of the 40 automated messages a day go to
// monthly reports when both automations are on; the rest go to transaction updates.
export const MONTHLY_REPORT_SHARE_OPTIONS = [5, 10, 15, 20];
export const DEFAULT_MONTHLY_REPORT_SHARE = 10;
export const DAILY_AUTOMATION_CAP = 40;

const COLUMNS = "auto_whatsapp_enabled, monthly_reports_enabled, monthly_report_daily_share";
const LEGACY_COLUMNS = "auto_whatsapp_enabled, monthly_reports_enabled";

function toSettings(data) {
  const share = Number(data?.monthly_report_daily_share);
  return {
    autoWhatsAppEnabled: data?.auto_whatsapp_enabled !== false,
    monthlyReportsEnabled: data?.monthly_reports_enabled === true,
    monthlyReportDailyShare: Number.isInteger(share) ? share : DEFAULT_MONTHLY_REPORT_SHARE,
  };
}

export function createAutomationServices(supabase) {
  async function fetchAutomationSettings(userId) {
    if (!userId) return toSettings(null);

    let { data, error } = await supabase
      .from("seller_signal_automation_settings")
      .select(COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();

    // 42703: the share column isn't in this database yet; use the default split.
    if (error?.code === "42703") {
      ({ data, error } = await supabase
        .from("seller_signal_automation_settings")
        .select(LEGACY_COLUMNS)
        .eq("user_id", userId)
        .maybeSingle());
    }

    if (error) throw new Error(error.message);
    return toSettings(data);
  }

  async function saveAutomationSettings(userId, settings) {
    if (!userId) throw new Error("Sign in to change automation settings.");

    const row = {
      user_id: userId,
      auto_whatsapp_enabled: Boolean(settings.autoWhatsAppEnabled),
      monthly_reports_enabled: Boolean(settings.monthlyReportsEnabled),
    };
    const share = Number(settings.monthlyReportDailyShare);
    if (Number.isInteger(share)) row.monthly_report_daily_share = Math.max(0, Math.min(DAILY_AUTOMATION_CAP, share));

    let { data, error } = await supabase
      .from("seller_signal_automation_settings")
      .upsert(row, { onConflict: "user_id" })
      .select(COLUMNS)
      .single();

    if (error?.code === "42703" || error?.code === "PGRST204") {
      delete row.monthly_report_daily_share;
      ({ data, error } = await supabase
        .from("seller_signal_automation_settings")
        .upsert(row, { onConflict: "user_id" })
        .select(LEGACY_COLUMNS)
        .single());
    }

    if (error) throw new Error(error.message);
    return toSettings(data);
  }

  return { fetchAutomationSettings, saveAutomationSettings };
}
