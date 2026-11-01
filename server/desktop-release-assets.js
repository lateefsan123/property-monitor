import process from "node:process";

const GITHUB_RELEASES_LATEST_URL =
  "https://api.github.com/repos/lateefsan123/property-monitor/releases/latest";
const WINDOWS_INSTALLER_PATTERN = /^Repeat-AI-Setup-.+\.exe$/i;
const GITHUB_LATEST_DOWNLOAD_URL =
  "https://github.com/lateefsan123/property-monitor/releases/latest/download/";

function getGitHubHeaders() {
  const token = process.env.GITHUB_RELEASES_TOKEN?.trim()
    || process.env.GITHUB_TOKEN?.trim();
  const headers = {
    "User-Agent": "Repeat-AI-Desktop-Updates",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function findWindowsInstallerAsset(release) {
  if (!Array.isArray(release?.assets)) {
    return null;
  }

  return release.assets.find((asset) => (
    typeof asset?.name === "string"
      && typeof asset?.browser_download_url === "string"
      && WINDOWS_INSTALLER_PATTERN.test(asset.name)
  )) ?? null;
}

export async function fetchLatestDesktopRelease() {
  try {
    const response = await fetch(GITHUB_RELEASES_LATEST_URL, {
      headers: getGitHubHeaders(),
    });
    if (response.ok) return await response.json();
  } catch {
    // The public updater manifest remains available if GitHub's API fails.
  }

  try {
    const response = await fetch(`${GITHUB_LATEST_DOWNLOAD_URL}latest.yml`);
    if (!response.ok) return null;
    const manifest = await response.text();
    const name = manifest.match(/^path:\s*["']?([^\r\n"']+)["']?\s*$/m)?.[1]?.trim();
    if (!name || !WINDOWS_INSTALLER_PATTERN.test(name) || /[/\\]/.test(name)) return null;
    return { assets: [{ name, browser_download_url: `${GITHUB_LATEST_DOWNLOAD_URL}${encodeURIComponent(name)}` }] };
  } catch {
    return null;
  }
}
