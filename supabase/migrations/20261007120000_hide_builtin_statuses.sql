-- An account can hide a built-in status it doesn't use: it disappears from
-- status pickers and filters, while sellers who already have it keep it.
alter table public.seller_signal_statuses
  add column if not exists hidden boolean not null default false;
