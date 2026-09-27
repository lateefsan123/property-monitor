export function profileUpdates(name, avatarUrl) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Please enter your name.');
  if (trimmed.length > 80) throw new Error('Keep your name to 80 characters or fewer.');
  return { username: trimmed, full_name: trimmed, avatar_url: avatarUrl || null };
}

export async function saveProfile(client, userId, name, avatarUrl) {
  const updates = profileUpdates(name, avatarUrl);
  const { data: current, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!userId || current.user?.id !== userId) throw new Error('Your account changed. Please reopen your profile.');
  const { data, error } = await client.auth.updateUser({ data: updates });
  if (error) throw error;
  return data.user;
}
