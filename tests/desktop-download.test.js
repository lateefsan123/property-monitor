import test from "node:test";
import assert from "node:assert/strict";
import { fetchLatestDesktopRelease, findWindowsInstallerAsset } from "../server/desktop-release-assets.js";

test("falls back to the public updater manifest when GitHub API is unavailable", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return calls.length === 1
      ? new Response("rate limited", { status: 403 })
      : new Response("version: 1.0.2\npath: Repeat-AI-Setup-1.0.2.exe\n");
  });
  const installer = findWindowsInstallerAsset(await fetchLatestDesktopRelease());
  assert.equal(installer.browser_download_url, "https://github.com/lateefsan123/property-monitor/releases/latest/download/Repeat-AI-Setup-1.0.2.exe");
  assert.equal(calls[1], "https://github.com/lateefsan123/property-monitor/releases/latest/download/latest.yml");
});

test("does not redirect to a path supplied outside the release assets", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => url.includes("api.github.com")
    ? new Response("unavailable", { status: 503 })
    : new Response("path: Repeat-AI-Setup-../../other.exe\n"));
  assert.equal(await fetchLatestDesktopRelease(), null);
});

test("returns unavailable if both release sources fail", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("network unavailable"); });
  assert.equal(await fetchLatestDesktopRelease(), null);
});

test("selects the Repeat AI Windows installer from release assets", () => {
  const installer = findWindowsInstallerAsset({
    assets: [
      {
        name: "latest.yml",
        browser_download_url: "https://example.com/latest.yml",
      },
      {
        name: "Repeat-AI-Setup-1.0.0.exe.blockmap",
        browser_download_url: "https://example.com/installer.blockmap",
      },
      {
        name: "Repeat-AI-Setup-1.0.0.exe",
        browser_download_url: "https://example.com/installer.exe",
      },
    ],
  });

  assert.deepEqual(installer, {
    name: "Repeat-AI-Setup-1.0.0.exe",
    browser_download_url: "https://example.com/installer.exe",
  });
});

test("returns null when a release does not contain a Windows installer", () => {
  assert.equal(
    findWindowsInstallerAsset({
      assets: [
        {
          name: "latest.yml",
          browser_download_url: "https://example.com/latest.yml",
        },
      ],
    }),
    null,
  );
});
