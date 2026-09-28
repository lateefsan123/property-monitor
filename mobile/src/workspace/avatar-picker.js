import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { AVATAR_PIXELS, AVATAR_QUALITY } from '../../../shared/profile-avatar';

// Opens the camera or photo library and returns a square, resized JPEG data
// URI ready for saveProfile, or null when the person cancels.
export async function pickAvatarPhoto(camera = false) {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Allow camera access in your phone settings to take a photo. You can also choose a photo instead.');
  }
  const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  const side = Math.min(asset.width, asset.height);
  const resized = await manipulateAsync(asset.uri, [
    { crop: { originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side } },
    { resize: { width: Math.min(side, AVATAR_PIXELS), height: Math.min(side, AVATAR_PIXELS) } },
  ], { format: SaveFormat.JPEG, compress: AVATAR_QUALITY, base64: true });
  if (!resized.base64) throw new Error('Could not process that photo.');
  return `data:image/jpeg;base64,${resized.base64}`;
}
