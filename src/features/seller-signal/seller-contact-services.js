import { supabase } from '../../supabase';
import { dubaiDateKey, followUpAfterDays } from '../../../supabase/functions/_shared/seller-follow-up.js';

export async function saveSellerFollowUp(userId, leadId, { days, contactedToday, clear }) {
  const updates = { next_follow_up_on: clear ? null : followUpAfterDays(days) };
  if (contactedToday && !clear) updates.last_contact = dubaiDateKey();
  const { data, error } = await supabase.from('leads').update(updates).eq('user_id', userId).eq('id', leadId).select('id').single();
  if (error) throw error;
  return data;
}

export async function uploadSellerAttachment(userId, leadId, file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP image under 5 MB.');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/seller-attachments/${leadId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('seller-signal-template-images').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
