export const STORE_URL = 'https://apps.apple.com/app/id6762112437';
// Apple's public lookup only ever lists the version that is live on the App Store,
// so a build still in review or TestFlight is never offered to anyone.
export const STORE_LOOKUP_URL = 'https://itunes.apple.com/lookup?id=6762112437&country=us';
export const AUTO_UPDATE_KEY = '@repeat_ai_auto_updates';
export const DISMISS_KEY = '@repeat_ai_update_dismissal';

export function compareVersions(left, right) {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

// Returns { version, build, highlights } when the live App Store version is newer than the
// installed one. The lookup carries no build number, so only a higher version counts.
export function readStoreRelease(data, installedVersion) {
  const item = data?.results?.[0];
  const version = typeof item?.version === 'string' ? item.version : '';
  if (item?.kind !== 'software' || !/^\d+(\.\d+){0,2}$/.test(version)) return null;
  if (compareVersions(version, installedVersion) <= 0) return null;
  return { version, build: 0, highlights: [] };
}

export async function getStoreRelease(installedVersion) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(STORE_LOOKUP_URL, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Could not check for updates.');
    return readStoreRelease(await response.json(), installedVersion);
  } finally { clearTimeout(timeout); }
}
