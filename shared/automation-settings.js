// Shared by desktop and native. The authenticated client is supplied by each app.
// monthlyReportDailyShare: how many of the 40 automated messages a day go to
// monthly reports when both automations are on; the rest go to transaction updates.
export const MONTHLY_REPORT_SHARE_OPTIONS = [5, 10, 15, 20];
export const DEFAULT_MONTHLY_REPORT_SHARE = 10;
export const DAILY_AUTOMATION_CAP = 40;
// Send hours (Dubai) and the gap between automated messages, per account.
export { DEFAULT_SEND_INTERVAL_MINUTES, DEFAULT_SEND_WINDOW, SEND_INTERVAL_OPTIONS, formatHour, formatInterval, messagesThatFit } from "../supabase/functions/_shared/send-pacing.js";
import { normalizePacing } from "../supabase/functions/_shared/send-pacing.js";

const PACING_COLUMNS = "send_window_start_hour, send_window_end_hour, send_interval_minutes, daily_message_limit";
const COLUMNS = `auto_whatsapp_enabled, monthly_reports_enabled, monthly_report_daily_share, ${PACING_COLUMNS}`;
const SHARE_COLUMNS = "auto_whatsapp_enabled, monthly_reports_enabled, monthly_report_daily_share";
const LEGACY_COLUMNS = "auto_whatsapp_enabled, monthly_reports_enabled";

function toSettings(data) {
  const share = Number(data?.monthly_report_daily_share);
  const pacing = normalizePacing(data);
  return {
    autoWhatsAppEnabled: data?.auto_whatsapp_enabled !== false,
    monthlyReportsEnabled: data?.monthly_reports_enabled === true,
    monthlyReportDailyShare: Number.isInteger(share) ? share : DEFAULT_MONTHLY_REPORT_SHARE,
    sendWindowStartHour: pacing.start,
    sendWindowEndHour: pacing.end,
    sendIntervalMinutes: pacing.interval,
    dailyMessageLimit: clampDailyLimit(data?.daily_message_limit),
  };
}

// Messages per Dubai day an account chooses, 1 to the 40 hard maximum.
export function clampDailyLimit(value) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number >= 1 ? Math.min(DAILY_AUTOMATION_CAP, number) : DAILY_AUTOMATION_CAP;
}

const missingColumn = (error) => error?.code === "42703" || error?.code === "PGRST204";

export function createAutomationServices(supabase) {
  async function fetchAutomationSettings(userId) {
    if (!userId) return toSettings(null);

    let { data, error } = await supabase
      .from("seller_signal_automation_settings")
      .select(COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();

    // 42703: newer columns aren't in this database yet; use the defaults.
    for (const columns of [SHARE_COLUMNS, LEGACY_COLUMNS]) {
      if (error?.code !== "42703") break;
      ({ data, error } = await supabase
        .from("seller_signal_automation_settings")
        .select(columns)
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
    if (settings.sendWindowStartHour !== undefined || settings.sendIntervalMinutes !== undefined) {
      const pacing = normalizePacing({
        send_window_start_hour: settings.sendWindowStartHour,
        send_window_end_hour: settings.sendWindowEndHour,
        send_interval_minutes: settings.sendIntervalMinutes,
      });
      row.send_window_start_hour = pacing.start;
      row.send_window_end_hour = pacing.end;
      row.send_interval_minutes = pacing.interval;
    }
    if (settings.dailyMessageLimit !== undefined) row.daily_message_limit = clampDailyLimit(settings.dailyMessageLimit);

    let { data, error } = await supabase
      .from("seller_signal_automation_settings")
      .upsert(row, { onConflict: "user_id" })
      .select(COLUMNS)
      .single();

    if (missingColumn(error)) {
      delete row.send_window_start_hour;
      delete row.send_window_end_hour;
      delete row.send_interval_minutes;
      delete row.daily_message_limit;
      ({ data, error } = await supabase
        .from("seller_signal_automation_settings")
        .upsert(row, { onConflict: "user_id" })
        .select(SHARE_COLUMNS)
        .single());
    }
    if (missingColumn(error)) {
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
