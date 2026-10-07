-- The dedicated automation account can use ordinary messages with any status.
-- The UUID was verified against auth.users; email/profile claims cannot opt in.
-- Existing template and Storage ownership RLS is unchanged.
alter table public.seller_signal_message_templates
  drop constraint seller_signal_message_templates_transactions_token;
alter table public.seller_signal_message_templates
  add constraint seller_signal_message_templates_transactions_token check (
    user_id = '231dbddd-efae-45b6-99ce-a72d68c32043'::uuid
    or position('{{transactions}}' in content) > 0
    or (not is_default and public.seller_signal_template_has_custom_status(statuses))
  );

-- Not Interested remains an opt-out for automatic sends, but may have a saved
-- template for the automation account's manual workflow.
alter table public.seller_signal_message_templates
  drop constraint seller_signal_message_templates_statuses_known;
alter table public.seller_signal_message_templates
  add constraint seller_signal_message_templates_statuses_known check (
    public.seller_signal_template_statuses_known(
      case when user_id = '231dbddd-efae-45b6-99ce-a72d68c32043'::uuid
        then array_remove(statuses, 'not_interested') else statuses end
    )
  );

update storage.buckets set file_size_limit = 16777216,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
where id = 'seller-signal-template-images';

alter table public.whatsapp_messages drop constraint whatsapp_messages_message_type_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_message_type_check
  check (message_type in ('template', 'text', 'image', 'video'));
