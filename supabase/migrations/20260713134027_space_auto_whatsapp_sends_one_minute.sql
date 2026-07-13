do $$
begin
  perform cron.unschedule('seller-signal-auto-whatsapp');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'seller-signal-auto-whatsapp',
  '* * * * *',
  $$
  with auto_secret as (
    select decrypted_secret as token
    from vault.decrypted_secrets
    where name = 'seller_signal_auto_whatsapp_token'
    order by updated_at desc nulls last, created_at desc
    limit 1
  )
  select net.http_post(
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/seller-signal-auto-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-auto-whatsapp-token', (select token from auto_secret)
    ),
    body := '{"dryRun":false,"maxSends":1}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (select 1 from auto_secret where nullif(token, '') is not null);
  $$
);
