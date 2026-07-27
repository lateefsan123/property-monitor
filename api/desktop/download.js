import {
  fetchLatestDesktopRelease,
  findWindowsInstallerAsset,
} from "./release-assets.js";

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const release = await fetchLatestDesktopRelease();
  if (!release) {
    sendJson(response, 502, { error: "Could not load the latest desktop release." });
    return;
  }

  const installer = findWindowsInstallerAsset(release);
  if (!installer) {
    sendJson(response, 404, { error: "The Windows installer is not available yet." });
    return;
  }

  response.statusCode = 307;
  response.setHeader("Location", installer.browser_download_url);
  response.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  );
  response.end();
}
