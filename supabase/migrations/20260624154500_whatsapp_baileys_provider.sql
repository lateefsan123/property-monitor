alter table public.whatsapp_accounts
  drop constraint if exists whatsapp_accounts_provider_check;

alter table public.whatsapp_accounts
  add constraint whatsapp_accounts_provider_check
  check (provider in ('meta', 'baileys'));

alter table public.whatsapp_accounts
  alter column waba_id drop not null,
  alter column phone_number_id drop not null;

create unique index if not exists whatsapp_accounts_user_baileys_session_idx
  on public.whatsapp_accounts (user_id, phone_number_id)
  where provider = 'baileys' and phone_number_id is not null;
