import { useAppUpdates } from '../app-updates-context';
import AppUpdateSheet from './AppUpdateSheet';

// `enabled` is false while a person could be mid-task: anywhere but Home and Settings, and
// while another sheet or the voice assistant is open. The sheet never restarts the app by itself.
export default function AppUpdatePrompt({ enabled, colors }) {
  const updates = useAppUpdates();
  return <AppUpdateSheet colors={colors} visible={enabled && updates.visible}
    kind={updates.release ? 'store' : 'ota'} version={updates.release?.version}
    highlights={updates.release?.highlights} ready={updates.otaReady}
    automatic={updates.automatic} automaticSupported={updates.automaticSupported}
    onAutomaticChange={value => { void updates.setAutomatic(value); }}
    busy={updates.busy} error={updates.error} onClose={updates.dismiss}
    onUpdate={() => { void updates.install(); }} />;
}
