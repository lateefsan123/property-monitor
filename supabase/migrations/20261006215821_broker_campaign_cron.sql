select cron.schedule('broker-campaign-dispatcher','*/5 * * * *',$job$
  select net.http_post(
    url := 'https://zrqxaammmrydkekbphqa.supabase.co/functions/v1/broker-campaign-dispatcher',
    headers := jsonb_build_object('Content-Type','application/json','x-auto-whatsapp-token',
      (select decrypted_secret from vault.decrypted_secrets where name='seller_signal_auto_whatsapp_token')),
    body := '{"dryRun":false}'::jsonb,
    timeout_milliseconds := 60000
  ) where exists (select 1 from public.broker_campaigns where status='active');
$job$);
