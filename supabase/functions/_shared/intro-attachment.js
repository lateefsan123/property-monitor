// A template image introduces the agent once; follow-ups should be text-only.
export function introAttachmentPath(imagePath, lead, sentAt, included = true) {
  return included && !sentAt && !lead?.sentAt && !lead?.sent_at ? imagePath || null : null;
}

export async function hasPriorWhatsAppContact(client, { userId, phone, sentAt }) {
  if (sentAt) return true;
  const { data, error } = await client.from('whatsapp_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('direction', 'outbound')
    .eq('recipient_phone', phone)
    .in('status', ['sending', 'sent', 'delivered', 'read'])
    .limit(1);
  // Never guess that a recipient is new when their history could not be read.
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}
