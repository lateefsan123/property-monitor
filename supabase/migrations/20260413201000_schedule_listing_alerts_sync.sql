-- Schedule listing-alerts-sync to run every 3 hours.
-- Uses pg_cron + pg_net to invoke the edge function in admin mode,
-- which syncs all users' watchlists and sends push notifications for price drops.

select cron.schedule(
  'listing-alerts-sync',
  '0 */3 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/listing-alerts-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
