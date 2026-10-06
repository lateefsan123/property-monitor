-- Templates can be assigned to an account's own statuses ("custom:<uuid>")
-- as well as the built-in ones.
create or replace function public.seller_signal_template_statuses_known(statuses text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(
    status in ('none', 'prospect', 'market_appraisal', 'for_sale_available')
    or status ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ), true)
  from unnest(coalesce(statuses, '{}'::text[])) as status;
$$;

alter table public.seller_signal_message_templates
  drop constraint if exists seller_signal_message_templates_statuses_known;

alter table public.seller_signal_message_templates
  add constraint seller_signal_message_templates_statuses_known
  check (public.seller_signal_template_statuses_known(statuses));

-- A template used only for status follow-ups (assigned to a custom status and
-- not the default) needn't contain {{transactions}}; sale updates still do,
-- and the transaction sender ignores templates without it.
create or replace function public.seller_signal_template_has_custom_status(statuses text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_or(status like 'custom:%'), false)
  from unnest(coalesce(statuses, '{}'::text[])) as status;
$$;

alter table public.seller_signal_message_templates
  drop constraint if exists seller_signal_message_templates_transactions_token;

alter table public.seller_signal_message_templates
  add constraint seller_signal_message_templates_transactions_token
  check (
    position('{{transactions}}' in content) > 0
    or (not is_default and public.seller_signal_template_has_custom_status(statuses))
  );
