// Older feeds and saved snapshots use Bayut's retired image hostname.
// Resolve it at display time so cached listings work without rewriting data.
export function listingPhotoUrl(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^https?:\/\/images\.byt\.com(?=\/|$)/i, 'https://images.bayut.com');
}
