'use strict';

const path = require('node:path');
const {
  flipFuses,
  FuseState,
  FuseVersion,
  FuseV1Options,
  getCurrentFuseWire,
} = require('@electron/fuses');

const EXPECTED_FUSE_COUNT = 9;
const WASM_TRAP_HANDLERS_INDEX = 8;

async function verifyHardenedFuseWire(executablePath) {
  const fuseWire = await getCurrentFuseWire(executablePath);
  const fuseIndexes = Object.keys(fuseWire).filter((key) => /^\d+$/.test(key));

  if (fuseIndexes.length !== EXPECTED_FUSE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_FUSE_COUNT} Electron fuses, found ${fuseIndexes.length}.`,
    );
  }

  const expectedStates = new Map([
    [FuseV1Options.RunAsNode, FuseState.DISABLE],
    [FuseV1Options.EnableCookieEncryption, FuseState.ENABLE],
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseState.DISABLE],
    [FuseV1Options.EnableNodeCliInspectArguments, FuseState.DISABLE],
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseState.ENABLE],
    [FuseV1Options.OnlyLoadAppFromAsar, FuseState.ENABLE],
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot, FuseState.DISABLE],
    [FuseV1Options.GrantFileProtocolExtraPrivileges, FuseState.DISABLE],
    [WASM_TRAP_HANDLERS_INDEX, FuseState.ENABLE],
  ]);

  for (const [index, expectedState] of expectedStates) {
    if (fuseWire[index] !== expectedState) {
      throw new Error(
        `Electron fuse ${index} has state ${fuseWire[index]}, expected ${expectedState}.`,
      );
    }
  }
}

module.exports = async function hardenPackagedElectron(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const executablePath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.exe`,
  );

  await flipFuses(executablePath, {
    version: FuseVersion.V1,
    strictlyRequireAllFuses: false,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });

  await verifyHardenedFuseWire(executablePath);
};
