import { Text } from "react-native";
import { useAppUpdates } from "../app-updates-context";
import { SettingsGroup, SettingsItem, SettingsToggle } from "../components/SettingsLayout";

// FighterCenter's "App updates" settings group: automatic toggle, manual check, and the result line.
export default function AppUpdatesSettings({ colors }) {
  const updates = useAppUpdates();
  return <>
    <SettingsGroup title="App updates" colors={colors}>
      {updates.automaticSupported ? <SettingsItem icon="download" label="Automatic updates" colors={colors}>
        <SettingsToggle colors={colors} accessibilityLabel="Automatic updates" value={updates.automatic}
          disabled={!updates.preferencesReady} onValueChange={value => { void updates.setAutomatic(value); }} />
      </SettingsItem> : null}
      <SettingsItem icon="refresh" label={updates.busy ? "Checking…" : "Check for updates"} colors={colors} last
        onPress={() => { void updates.check(true); }} />
    </SettingsGroup>
    {updates.message || updates.error ? <Text accessibilityLiveRegion="polite"
      style={{ color: updates.error ? colors.errorText : colors.textMuted, fontSize: 13, marginTop: 10, marginLeft: 4 }}>
      {updates.error ?? updates.message}
    </Text> : null}
  </>;
}
