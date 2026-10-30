import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { AppState, Linking, Platform } from 'react-native';
import { AUTO_UPDATE_KEY, DISMISS_KEY, STORE_URL, getStoreRelease } from './app-updates';

const COPY = {
  savePreferenceFailed: 'Could not save your preference. Please try again.',
  storeCheckFailed: 'Could not check the App Store. Please try again later.',
  noUpdates: 'No published updates found.',
  checkFailed: 'Could not check for updates. Please try again later.',
  updateFailed: 'Could not update right now. Please try again.',
};
const Context = createContext(null);
const DAY = 24 * 60 * 60 * 1000;
const INTERVAL = 6 * 60 * 60 * 1000;

// Same behaviour as FighterCenter: the app checks the App Store and EAS Update itself
// (updates.checkAutomatically is NEVER), shows a prompt, and only restarts when the
// person taps Restart. Nothing restarts the app on its own, so edits and messages are safe.
export function AppUpdatesProvider({ children }) {
  const [automatic, setAuto] = useState(true);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [release, setRelease] = useState(null);
  const [otaAvailable, setOtaAvailable] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const checking = useRef(false);
  const lastCheck = useRef(0);
  const dismissal = useRef(null);
  const { isUpdatePending, isUpdateAvailable, isDownloading, isChecking, availableUpdate, downloadedUpdate } = Updates.useUpdates();
  // "Later" hides only the update it was shown for; a newer one prompts again.
  const otaId = useRef(null);
  const native = Platform.OS === 'ios' || Platform.OS === 'android';
  // A binary that checks at startup regardless of JS preferences can't honour an opt-out.
  const automaticSupported = native && Updates.isEnabled && Updates.checkAutomatically === 'NEVER';

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(AUTO_UPDATE_KEY), AsyncStorage.getItem(DISMISS_KEY)])
      .then(([preference, saved]) => {
        if (!active) return;
        setAuto(preference !== 'false');
        try { dismissal.current = saved ? JSON.parse(saved) : null; } catch { dismissal.current = null; }
      }).catch(() => {}).finally(() => { if (active) setPreferencesReady(true); });
    return () => { active = false; };
  }, []);

  const setAutomatic = useCallback(async (value) => {
    try {
      await AsyncStorage.setItem(AUTO_UPDATE_KEY, String(value));
      setAuto(value);
      setError(null);
    } catch { setError('savePreferenceFailed'); }
  }, []);

  const check = useCallback(async (manual = false) => {
    if (!native || !preferencesReady || checking.current || isDownloading || isChecking) return;
    if (!manual && Date.now() - lastCheck.current < INTERVAL) return;
    checking.current = true;
    lastCheck.current = Date.now();
    if (manual) setBusy(true);
    setError(null); setMessage(null);
    let storeFailed = false;
    let nextRelease = null;
    let available = isUpdateAvailable;
    let ready = isUpdatePending;
    try {
      try {
        nextRelease = await getStoreRelease(Constants.expoConfig?.version ?? '0.0.0');
        setRelease(nextRelease);
      } catch { storeFailed = true; }
      if (Updates.isEnabled && !ready) {
        const result = await Updates.checkForUpdateAsync();
        available = result.isAvailable || result.isRollBackToEmbedded;
        if (result.isAvailable) otaId.current = result.manifest?.id ?? otaId.current;
        if (available && automatic && !nextRelease) {
          const fetched = await Updates.fetchUpdateAsync();
          ready = fetched.isNew || fetched.isRollBackToEmbedded;
        }
      }
      setOtaAvailable(available);
      otaId.current ??= availableUpdate?.updateId ?? downloadedUpdate?.updateId ?? null;
      const id = nextRelease ? `store:${nextRelease.version}:${nextRelease.build}` : `ota:${otaId.current ?? 'unknown'}`;
      const dismissed = dismissal.current?.id === id && Date.now() - dismissal.current.at < DAY;
      // Offer every new update with a prompt (downloaded first when automatic updates are on, so
      // "Restart app" just restarts). AppUpdatePrompt only opens it on Home and Settings.
      if (manual || (nextRelease && !dismissed) || ((available || ready) && !dismissed)) {
        setVisible(Boolean(nextRelease || available || ready));
      }
      if (manual && !nextRelease && !available && !ready) {
        if (storeFailed) setError('storeCheckFailed');
        else setMessage('noUpdates');
      }
    } catch {
      if (manual) setError('checkFailed');
    } finally { checking.current = false; setBusy(false); }
  }, [automatic, native, preferencesReady, isDownloading, isChecking, isUpdateAvailable, isUpdatePending, availableUpdate, downloadedUpdate]);

  useEffect(() => {
    if (!native || !preferencesReady || globalThis.__DEV__) return undefined;
    // Check right after launch so the update prompt comes up as the app opens.
    const timer = setTimeout(() => { void check(); }, 1500);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [check, native, preferencesReady]);

  const dismiss = useCallback(() => {
    setVisible(false);
    const value = { id: release ? `store:${release.version}:${release.build}` : `ota:${otaId.current ?? 'unknown'}`, at: Date.now() };
    dismissal.current = value;
    void AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(value)).catch(() => {});
  }, [release]);

  const install = useCallback(async () => {
    if (checking.current || busy || isDownloading) return;
    setBusy(true); setError(null);
    try {
      if (release) {
        await Linking.openURL(STORE_URL);
        dismiss();
      } else if (Updates.isEnabled) {
        if (isUpdatePending) {
          // Close the sheet before restarting so no modal is left open across reloadAsync.
          setVisible(false);
          await new Promise((resolve) => setTimeout(resolve, 450));
          await Updates.reloadAsync();
        } else {
          const result = await Updates.fetchUpdateAsync();
          if (!result.isNew && !result.isRollBackToEmbedded) setMessage('noUpdates');
        }
      }
    } catch { setError('updateFailed'); }
    finally { setBusy(false); }
  }, [busy, dismiss, isDownloading, isUpdatePending, release]);

  return <Context.Provider value={{ automatic, automaticSupported, preferencesReady, setAutomatic, release,
    otaAvailable, otaReady: isUpdatePending, visible, busy: busy || isDownloading,
    error: error ? COPY[error] : null, message: message ? COPY[message] : null, check, dismiss, install }}>
    {children}
  </Context.Provider>;
}

export function useAppUpdates() {
  const value = useContext(Context);
  if (!value) throw new Error('AppUpdatesProvider is required');
  return value;
}
