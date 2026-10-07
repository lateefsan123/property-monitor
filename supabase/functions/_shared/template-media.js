export const TEMPLATE_VIDEO_MAX_BYTES = 16 * 1024 * 1024;
export const TEMPLATE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
export const templateMediaType = (path) => /\.mp4$/i.test(String(path || '')) ? 'video' : 'image';

/** @param {{to: string, body: string, imageUrl?: string | null, mediaType?: string}} input */
export function templateMediaPayload({ to, body, imageUrl, mediaType = 'image' }, graph = false) {
  if (!String(body || '').trim()) throw new Error('Message text is required.');
  const base = graph ? { messaging_product: 'whatsapp', to } : { to };
  if (!imageUrl) return { ...base, type: 'text', text: { body, preview_url: false } };
  if (!['image', 'video'].includes(mediaType)) throw new Error('Unsupported attachment type.');
  if (body.length > 1024) throw new Error('Attachment captions must be 1,024 characters or fewer after placeholders are filled.');
  return { ...base, type: mediaType, [mediaType]: { [graph ? 'link' : 'url']: imageUrl, caption: body } };
}
