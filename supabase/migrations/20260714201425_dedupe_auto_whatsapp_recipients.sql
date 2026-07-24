-- Historical duplicate sends are immutable, so enforce recipient/date
-- uniqueness from the day this guard was introduced onward.
create unique index if not exists whatsapp_messages_user_recipient_market_date_active_idx
  on public.whatsapp_messages (user_id, recipient_phone, market_transaction_date)
  where direction = 'outbound'
    and market_transaction_date >= date '2026-07-14'
    and status in ('queued', 'sending', 'sent', 'delivered', 'read');
