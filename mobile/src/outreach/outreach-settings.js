import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SettingsGroup, SettingsItem, SettingsProfile, SettingsToggle, settingsBackground } from '../components/SettingsLayout';
import { Feedback } from '../workspace/ui';
import { OUTREACH_SENDER } from '../../../shared/email-outreach';

// Settings in the original grouped layout: profile, sending inbox, preferences.
export default function OutreachSettings({ displayName, email, colors, theme, onToggleTheme, outreach }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const known = outreach.connections.data !== undefined;
  async function connect() {
    setConnecting(true); setError(null);
    try { await outreach.connect(); } catch (cause) { setError(cause); } finally { setConnecting(false); }
  }
  return <ScrollView style={{ backgroundColor: settingsBackground(colors) }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}>
    <SettingsProfile displayName={displayName || email} colors={colors} />
    <SettingsGroup title="Sending inbox" colors={colors}>
      <SettingsItem label={OUTREACH_SENDER} icon="mail" colors={colors} last value={!known ? 'Checking…' : outreach.gmailConnected ? 'Connected' : 'Connect'} disabled={connecting} onPress={connect} />
    </SettingsGroup>
    {error || outreach.connections.error ? <Feedback colors={colors} error={error || outreach.connections.error} onRetry={error ? undefined : outreach.connections.refetch} /> : null}
    {known && !outreach.gmailConnected ? <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 8, marginLeft: 4 }}>Choose {OUTREACH_SENDER} when Google asks which account to use.</Text> : null}
    <SettingsGroup title="Preferences" colors={colors}>
      <SettingsItem label="Dark mode" icon="moon" colors={colors} last>
        <SettingsToggle colors={colors} accessibilityLabel="Dark mode" value={theme === 'dark'} onValueChange={onToggleTheme} />
      </SettingsItem>
    </SettingsGroup>
  </ScrollView>;
}
