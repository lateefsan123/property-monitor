-- Seller statuses a message template is used for. Sends use the template for
-- the seller's status and fall back to the default template
-- (supabase/functions/_shared/template-status.js).
alter table public.seller_signal_message_templates
  add column if not exists statuses text[] not null default '{}';

alter table public.seller_signal_message_templates
  drop constraint if exists seller_signal_message_templates_statuses_known;

alter table public.seller_signal_message_templates
  add constraint seller_signal_message_templates_statuses_known
  check (statuses <@ array['none', 'prospect', 'market_appraisal', 'for_sale_available']::text[]);
