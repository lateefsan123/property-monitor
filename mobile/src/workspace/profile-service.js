import { saveAvatarProfile } from '../../../shared/profile-avatar.js';

export function profileUpdates(name, avatarUrl) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Please enter your name.');
  if (trimmed.length > 80) throw new Error('Keep your name to 80 characters or fewer.');
  return { username: trimmed, full_name: trimmed, avatar_url: avatarUrl || null };
}

export async function saveProfile(client, userId, name, avatarUrl) {
  const updates = profileUpdates(name, avatarUrl);
  if (!userId) throw new Error('Your account changed. Please reopen your profile.');
  return saveAvatarProfile(client, userId, updates);
}
