import process from "node:process";

const GITHUB_RELEASES_LATEST_URL =
  "https://api.github.com/repos/lateefsan123/property-monitor/releases/latest";
const WINDOWS_INSTALLER_PATTERN = /^Repeat-AI-Setup-.+\.exe$/i;

function getGitHubHeaders() {
  const token = process.env.GITHUB_RELEASES_TOKEN?.trim()
    || process.env.GITHUB_TOKEN?.trim();
  const headers = {
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
  const response = await fetch(GITHUB_RELEASES_LATEST_URL, {
    headers: getGitHubHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
