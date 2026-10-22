-- New accounts send automated WhatsApps every 15 minutes, not every 5, so 40
-- messages spread over the day instead of going out in a three-hour burst.
-- Accounts that already chose a gap keep it.
alter table public.seller_signal_automation_settings
  alter column send_interval_minutes set default 15;
