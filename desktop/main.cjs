'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  app,
  BrowserWindow,
  dialog,
  Menu,
  shell,
  Tray,
} = require('electron');
const { autoUpdater } = require('electron-updater');
const { getExternalUrl, isAppNavigationUrl } = require('./url-policy.cjs');

const PRODUCT_NAME = 'Repeat AI';
const PRODUCTION_URL = 'https://sellersignal.vercel.app';
const DESKTOP_URL_ENV = 'REPEAT_AI_DESKTOP_URL';
const DISABLE_UPDATES_ENV = 'REPEAT_AI_DESKTOP_DISABLE_UPDATES';
const UPDATE_CHECK_DELAY_MS = 5_000;
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

let mainWindow = null;
let tray = null;
let updateTimer = null;
let manualUpdateCheck = false;
let updateReady = false;

function getAppUrl() {
  return process.env[DESKTOP_URL_ENV]?.trim() || PRODUCTION_URL;
}

function getIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.png');
  }

  return path.resolve(__dirname, '../public/logo.png');
}

function getOfflinePagePath() {
  return path.resolve(__dirname, 'assets/offline.html');
}

function writeLog(level, message, error) {
  const suffix = error
    ? ` ${error instanceof Error ? error.stack || error.message : String(error)}`
    : '';
  const line = `${new Date().toISOString()} [${level}] ${message}${suffix}\n`;

  if (!app.isReady()) {
    return;
  }

  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'desktop.log'), line, 'utf8');
  } catch {
    // Logging must never stop the application.
  }
}

function showMainWindow() {
  if (!app.isReady()) {
    return;
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

async function openExternal(value) {
  const externalUrl = getExternalUrl(value);
  if (!externalUrl) {
    return;
  }

  await shell.openExternal(externalUrl);
}

function configureWindowNavigation(window, appUrl) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppNavigationUrl(url, appUrl)) {
      void window.loadURL(url);
    } else {
      void openExternal(url);
    }

    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (isAppNavigationUrl(url, appUrl)) {
      return;
    }

    event.preventDefault();
    void openExternal(url);
  });
}

async function loadApp(window, appUrl) {
  try {
    await window.loadURL(appUrl);
  } catch (error) {
    writeLog('error', `Could not load ${appUrl}.`, error);
    await window.loadFile(getOfflinePagePath());
  }
}

function createMainWindow() {
  const appUrl = getAppUrl();
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: PRODUCT_NAME,
    backgroundColor: '#080808',
    icon: getIconPath(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
    },
  });

  configureWindowNavigation(window, appUrl);

  window.once('ready-to-show', () => {
    window.show();
  });

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  void loadApp(window, appUrl);
  return window;
}

function refreshTrayMenu() {
  if (!tray) {
    return;
  }

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Open Repeat AI',
      click: showMainWindow,
    },
    {
      label: 'Check for updates',
      enabled: app.isPackaged && !updateReady,
      click: () => {
        void checkForUpdates(true);
      },
    },
    ...(updateReady
      ? [{
          label: 'Restart to update',
          click: installUpdate,
        }]
      : []),
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]));
}

function createTray() {
  tray = new Tray(getIconPath());
  tray.setToolTip(PRODUCT_NAME);
  tray.on('click', showMainWindow);
  refreshTrayMenu();
}

function shouldCheckForUpdates() {
  return app.isPackaged && process.env[DISABLE_UPDATES_ENV] !== '1';
}

async function checkForUpdates(userInitiated = false) {
  if (!shouldCheckForUpdates()) {
    if (userInitiated) {
      await dialog.showMessageBox({
        type: 'info',
        title: `${PRODUCT_NAME} updates`,
        message: 'Update checks are available in the installed app.',
      });
    }
    return;
  }

  manualUpdateCheck = userInitiated;

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    writeLog('error', 'Desktop update check failed.', error);
    if (manualUpdateCheck) {
      manualUpdateCheck = false;
      await dialog.showMessageBox({
        type: 'error',
        title: `${PRODUCT_NAME} updates`,
        message: 'Could not check for updates.',
        detail: 'Please try again later.',
      });
    }
  }
}

function installUpdate() {
  if (!updateReady) {
    return;
  }

  autoUpdater.quitAndInstall(true, true);
}

function configureAutoUpdates() {
  if (!shouldCheckForUpdates()) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    writeLog('info', 'Checking for a desktop update.');
  });

  autoUpdater.on('update-available', (info) => {
    manualUpdateCheck = false;
    writeLog('info', `Downloading desktop update ${info.version}.`);
  });

  autoUpdater.on('update-not-available', async (info) => {
    writeLog('info', `Desktop is up to date at ${info.version}.`);
    if (!manualUpdateCheck) {
      return;
    }

    manualUpdateCheck = false;
    await dialog.showMessageBox({
      type: 'info',
      title: `${PRODUCT_NAME} updates`,
      message: `${PRODUCT_NAME} is up to date.`,
      detail: `You are using version ${app.getVersion()}.`,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    writeLog('info', `Desktop update download is ${Math.round(progress.percent)}% complete.`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    updateReady = true;
    manualUpdateCheck = false;
    refreshTrayMenu();
    writeLog('info', `Desktop update ${info.version} is ready to install.`);

    const dialogOptions = {
      type: 'info',
      title: `${PRODUCT_NAME} update ready`,
      message: `Repeat AI ${info.version} is ready.`,
      detail: 'Restart the app to finish installing the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    };
    const { response } = mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showMessageBox(mainWindow, dialogOptions)
      : await dialog.showMessageBox(dialogOptions);

    if (response === 0) {
      installUpdate();
    }
  });

  autoUpdater.on('error', async (error) => {
    writeLog('error', 'Desktop updater error.', error);
    if (!manualUpdateCheck) {
      return;
    }

    manualUpdateCheck = false;
    await dialog.showMessageBox({
      type: 'error',
      title: `${PRODUCT_NAME} updates`,
      message: 'Could not check for updates.',
      detail: 'Please try again later.',
    });
  });

  setTimeout(() => {
    void checkForUpdates();
  }, UPDATE_CHECK_DELAY_MS);

  updateTimer = setInterval(() => {
    void checkForUpdates();
  }, UPDATE_CHECK_INTERVAL_MS);
  updateTimer.unref();
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', showMainWindow);

  app.whenReady().then(() => {
    app.setAppUserModelId('ai.repeat.desktop');
    Menu.setApplicationMenu(null);

    mainWindow = createMainWindow();
    createTray();
    configureAutoUpdates();
  });

  app.on('activate', showMainWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  });
}
