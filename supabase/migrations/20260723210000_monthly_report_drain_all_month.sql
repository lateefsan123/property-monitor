-- With ~30 spare sends/day under the shared 50/day cap and ~900 eligible
-- sellers, a days-1-7 window only reaches ~1 in 4. Drain all month instead;
-- the per-lead-per-month dedupe and the send-window/cap guards in the function
-- keep volume identical per day, and rotation in the function spreads coverage
-- fairly across months.
do $$
begin
  perform cron.unschedule('seller-signal-monthly-report');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'seller-signal-monthly-report',
  '*/30 * * * *',
  $$
  with auto_secret as (
    select decrypted_secret as token
    from vault.decrypted_secrets
    where name = 'seller_signal_auto_whatsapp_token'
    order by updated_at desc nulls last, created_at desc
    limit 1
  )
  select net.http_post(
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/seller-signal-monthly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-monthly-report-token', (select token from auto_secret)
    ),
    body := '{"dryRun":false,"maxSends":5}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from auto_secret where nullif(token, '') is not null);
  $$
);
