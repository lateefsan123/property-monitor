do $$
begin
  perform cron.unschedule('seller-signal-auto-whatsapp');
exception
  when others then
    null;
end $$;
