import test from "node:test";
import assert from "node:assert/strict";
import { findWindowsInstallerAsset } from "./release-assets.js";

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
