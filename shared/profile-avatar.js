export const AVATAR_PIXELS = 640;
export const AVATAR_QUALITY = 0.9;
const BUCKET = 'profile-avatars';
const MAX_BYTES = 1024 * 1024;

// Keep image bytes out of user metadata, which is also included in access tokens.
export async function saveAvatarProfile(client, userId, updates) {
  const { data: current, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!current.user || (userId && current.user.id !== userId)) {
    throw new Error('Your account changed. Please reopen your profile.');
  }
  const data = { ...updates };
  let uploadedPath;
  if (data.avatar_url?.startsWith('data:') && data.avatar_url !== current.user.user_metadata?.avatar_url) {
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(data.avatar_url);
    if (!match || match[1].length > Math.ceil(MAX_BYTES / 3) * 4) {
      throw new Error('Please choose a photo smaller than 1 MB after cropping.');
    }
    const bytes = Uint8Array.from(atob(match[1]), character => character.charCodeAt(0));
    if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Could not process that photo.');
    const path = `${current.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const bucket = client.storage.from(BUCKET);
    const { error } = await bucket.upload(path, bytes.buffer, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    uploadedPath = path;
    data.avatar_url = bucket.getPublicUrl(path).data.publicUrl;
  }
  try {
    const result = await client.auth.updateUser({ data });
    if (result.error) throw result.error;
    return result.data.user;
  } catch (error) {
    // A failed profile save must not leave a newly uploaded, unused photo behind.
    if (uploadedPath) await client.storage.from(BUCKET).remove([uploadedPath]).catch(() => {});
    throw error;
  }
}
