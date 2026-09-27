import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../../supabase';
import { dubaiDateKey, followUpAfterDays } from '../../../../supabase/functions/_shared/seller-follow-up';

export async function saveSellerFollowUp(userId, leadId, { days, calledToday, clear = false }) {
  const updates = { next_follow_up_on: clear ? null : followUpAfterDays(days) };
  if (calledToday && !clear) updates.last_contact = dubaiDateKey();
  const { data, error } = await supabase.from('leads').update(updates).eq('user_id', userId).eq('id', leadId).select('*').single();
  if (error) throw error;
  return data;
}

export async function pickSellerImage() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const resize = asset.width >= asset.height ? { width: Math.min(asset.width, 1600) } : { height: Math.min(asset.height, 1600) };
  const image = await manipulateAsync(asset.uri, [{ resize }], { format: SaveFormat.JPEG, compress: 0.85 });
  const bytes = Platform.OS === 'web' ? await (await fetch(image.uri)).arrayBuffer() : await new File(image.uri).arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
  return { uri: image.uri, bytes };
}

export async function uploadSellerImage(userId, leadId, image) {
  const path = `${userId}/seller-attachments/${leadId}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('seller-signal-template-images').upload(path, image.bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}
