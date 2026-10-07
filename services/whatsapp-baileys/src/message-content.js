export function baileysMediaContent({ text, imageUrl, videoUrl }) {
  if (imageUrl && videoUrl) throw new Error('Choose one attachment per message.');
  const url = videoUrl || imageUrl;
  if (!url) return { text };
  if (!/^https:\/\//i.test(url)) throw new Error('Attachment URL must use HTTPS');
  if (text.length > 1024) throw new Error('Attachment captions must be 1,024 characters or fewer.');
  return videoUrl
    ? { video: { url }, mimetype: 'video/mp4', caption: text }
    : { image: { url }, caption: text };
}
