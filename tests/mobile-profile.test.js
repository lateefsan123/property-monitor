import test from 'node:test';
import assert from 'node:assert/strict';
import { profileUpdates, saveProfile } from '../mobile/src/workspace/profile-service.js';

test('profile changes trim the name and keep web and mobile name fields consistent', () => {
  assert.deepEqual(profileUpdates('  Alex Smith  ', 'photo'), { username: 'Alex Smith', full_name: 'Alex Smith', avatar_url: 'photo' });
  assert.equal(profileUpdates('Alex', '').avatar_url, null);
  assert.throws(() => profileUpdates('  ', ''), /enter your name/);
  assert.throws(() => profileUpdates('a'.repeat(81), ''), /80 characters/);
});

test('save updates the authenticated profile only and returns persisted data', async () => {
  let stored;
  const client = { auth: {
    getUser: async () => ({ data: { user: { id: 'user-a' } } }),
    updateUser: async ({ data }) => { stored = data; return { data: { user: { id: 'user-a', user_metadata: data } } }; },
  } };
  const result = await saveProfile(client, 'user-a', 'Alex', 'photo');
  assert.equal(result.user_metadata.avatar_url, 'photo');
  assert.equal(stored.username, 'Alex');
  stored = undefined;
  await assert.rejects(saveProfile(client, 'user-b', 'Other', ''), /account changed/);
  assert.equal(stored, undefined);
});

test('failed saves surface an error rather than claiming success', async () => {
  const client = { auth: {
    getUser: async () => ({ data: { user: { id: 'a' } } }),
    updateUser: async () => ({ error: new Error('Offline') }),
  } };
  await assert.rejects(saveProfile(client, 'a', 'Alex', ''), /Offline/);
});
