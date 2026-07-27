# Repeat AI desktop

The desktop app is a hardened Electron shell around the live Repeat AI product at
`https://sellersignal.vercel.app`.

The web interface updates immediately with each production deployment. Changes to
the Electron shell are delivered through GitHub Releases with `electron-updater`.

## Local development

Open the live product in Electron:

```powershell
npm run desktop:dev
```

To load a local Vite server instead:

```powershell
$env:REPEAT_AI_DESKTOP_URL='http://localhost:5173'
npm run desktop:dev
```

## Build the Windows installer

```powershell
npm run desktop:package
```

The installer, blockmap, and `latest.yml` are generated in `desktop/release`.
The packaged app is launched for a startup smoke test before the command succeeds.

## Publish an auto-update release

1. Increase `desktop/package.json` `version`.
2. Commit and push the versioned desktop changes.
3. Run the `Publish Repeat AI desktop release` GitHub Actions workflow.
4. Confirm the GitHub release contains:
   - `Repeat-AI-Setup-<version>.exe`
   - `Repeat-AI-Setup-<version>.exe.blockmap`
   - `latest.yml`

Installed builds check for updates shortly after startup and every four hours.
Downloaded updates prompt the user to restart. The tray menu also provides a
manual `Check for updates` action.

For trusted releases, add the Windows certificate as `WINDOWS_CSC_LINK` and its
password as `WINDOWS_CSC_KEY_PASSWORD` in the repository's GitHub Actions
secrets. Electron Builder will then sign the installer and packaged executable
during the same workflow.
