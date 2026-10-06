-- Per-account pacing for automated WhatsApp sends: the Dubai hours messages
-- go out in and the gap between them. Defaults match the previous fixed
-- behaviour (9:00-21:00, every 5 minutes).

alter table public.seller_signal_automation_settings
  add column if not exists send_window_start_hour integer not null default 9,
  add column if not exists send_window_end_hour integer not null default 21,
  add column if not exists send_interval_minutes integer not null default 5;

alter table public.seller_signal_automation_settings
  drop constraint if exists seller_signal_automation_settings_send_window_check,
  drop constraint if exists seller_signal_automation_settings_send_interval_check;

alter table public.seller_signal_automation_settings
  add constraint seller_signal_automation_settings_send_window_check
    check (send_window_start_hour between 0 and 23
      and send_window_end_hour between 1 and 24
      and send_window_end_hour > send_window_start_hour),
  add constraint seller_signal_automation_settings_send_interval_check
    check (send_interval_minutes in (5, 10, 15, 30, 60));
