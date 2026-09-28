import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAvatarProfile } from '../shared/profile-avatar.js';

function fixture({ uploadError, saveError, existing } = {}) {
  const calls = { uploads: [], saves: [], removed: [] };
  const bucket = {
    upload: async (...args) => { calls.uploads.push(args); return { error: uploadError }; },
    getPublicUrl: path => ({ data: { publicUrl: `https://example.com/${path}` } }),
    remove: async paths => { calls.removed.push(...paths); return {}; },
  };
  const client = {
    storage: { from: () => bucket },
    auth: {
      getUser: async () => ({ data: { user: { id: 'owner', user_metadata: { avatar_url: existing } } } }),
      updateUser: async ({ data }) => {
        calls.saves.push(data);
        return { error: saveError, data: { user: { id: 'owner', user_metadata: data } } };
      },
    },
  };
  return { client, calls };
}
const photo = 'data:image/jpeg;base64,/9j/2Q==';

test('uploads original bytes under the authenticated owner and saves only the URL', async () => {
  const { client, calls } = fixture();
  const user = await saveAvatarProfile(client, 'owner', { avatar_url: photo, username: 'Musa' });
  assert.match(calls.uploads[0][0], /^owner\/.+\.jpg$/);
  assert.deepEqual(new Uint8Array(calls.uploads[0][1]), new Uint8Array([255, 216, 255, 217]));
  assert.equal(calls.uploads[0][2].upsert, false);
  assert.match(user.user_metadata.avatar_url, /^https:/);
  assert.equal(user.user_metadata.username, 'Musa');
});

test('account mismatch and oversized images do not upload or update a profile', async () => {
  const { client, calls } = fixture();
  await assert.rejects(saveAvatarProfile(client, 'other', { avatar_url: photo }), /account changed/);
  await assert.rejects(saveAvatarProfile(client, 'owner', { avatar_url: `data:image/jpeg;base64,${'A'.repeat(1500000)}` }), /smaller/);
  assert.equal(calls.uploads.length, 0);
  assert.equal(calls.saves.length, 0);
});

test('upload failure preserves the existing profile', async () => {
  const { client, calls } = fixture({ uploadError: new Error('Upload failed') });
  await assert.rejects(saveAvatarProfile(client, 'owner', { avatar_url: photo }), /Upload failed/);
  assert.equal(calls.saves.length, 0);
});

test('profile save failure cleans up only the new upload', async () => {
  const { client, calls } = fixture({ saveError: new Error('Save failed') });
  await assert.rejects(saveAvatarProfile(client, 'owner', { avatar_url: photo }), /Save failed/);
  assert.deepEqual(calls.removed, [calls.uploads[0][0]]);
});

test('unchanged legacy photos, existing URLs and removal require no upload', async () => {
  for (const avatar of [photo, 'https://example.com/photo.jpg', null]) {
    const { client, calls } = fixture({ existing: avatar });
    const user = await saveAvatarProfile(client, 'owner', { avatar_url: avatar });
    assert.equal(user.user_metadata.avatar_url, avatar);
    assert.equal(calls.uploads.length, 0);
  }
});
