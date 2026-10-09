-- Sellers whose number isn't on WhatsApp: set when a send is refused for that
-- reason, so automations skip them instead of trying again. Changing the
-- seller's phone clears it.
alter table public.leads add column if not exists whatsapp_missing_at timestamptz;

comment on column public.leads.whatsapp_missing_at is
  'When a send found this number is not on WhatsApp. Automations skip these sellers; cleared when the phone changes.';

create or replace function public.leads_clear_whatsapp_missing()
returns trigger
language plpgsql
as $$
begin
  if new.phone is distinct from old.phone then
    new.whatsapp_missing_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_clear_whatsapp_missing on public.leads;
create trigger leads_clear_whatsapp_missing
  before update of phone on public.leads
  for each row
  when (old.whatsapp_missing_at is not null)
  execute function public.leads_clear_whatsapp_missing();
