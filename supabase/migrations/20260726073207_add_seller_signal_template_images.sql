alter table public.seller_signal_message_templates
  add column if not exists image_path text;

alter table public.seller_signal_message_templates
  drop constraint if exists seller_signal_message_templates_image_path_owner;

alter table public.seller_signal_message_templates
  add constraint seller_signal_message_templates_image_path_owner
  check (
    image_path is null
    or (
      char_length(image_path) between 1 and 512
      and image_path like user_id::text || '/%'
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'seller-signal-template-images',
  'seller-signal-template-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own Seller Signal template images" on storage.objects;
create policy "Users can read own Seller Signal template images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'seller-signal-template-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload own Seller Signal template images" on storage.objects;
create policy "Users can upload own Seller Signal template images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'seller-signal-template-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own Seller Signal template images" on storage.objects;
create policy "Users can update own Seller Signal template images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'seller-signal-template-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'seller-signal-template-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own Seller Signal template images" on storage.objects;
create policy "Users can delete own Seller Signal template images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'seller-signal-template-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

alter table public.whatsapp_messages
  drop constraint if exists whatsapp_messages_message_type_check;

alter table public.whatsapp_messages
  add constraint whatsapp_messages_message_type_check
  check (message_type in ('template', 'text', 'image'));
