import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import AppIcon from '../components/AppIcon';
import BottomSheet from '../components/BottomSheet';
import { HOME_PROVIDERS } from './home-integration-providers';
import { connectIntegration } from './integration-connect';

export default function HomeConnectionPrompt({ feature, colors, userId, connections = [] }) {
  const email = feature === 'email';
  const options = HOME_PROVIDERS[feature];
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  const locked = useRef(false);
  function choose(provider) {
    if (locked.current) return;
    locked.current = true;
    pending.current = provider;
    setBusy(true);
    setOpen(false);
  }
  async function afterDismiss() {
    const provider = pending.current;
    pending.current = null;
    if (!provider) return;
    try {
      const result = await connectIntegration(provider, feature, feature === 'calendar' ? 'events' : undefined, userId);
      if (result.status === 'cancelled') return;
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['integration-connections', userId], exact: true }),
        cache.invalidateQueries({ queryKey: ['daily-email-summary', userId], exact: true }),
      ]);
    } catch (failure) { setError(failure.message || 'Could not connect. Please try again.'); setOpen(true); }
    finally { locked.current = false; setBusy(false); }
  }
  return <View style={{ gap: 14, paddingVertical: 12 }}>
    <View style={{ flexDirection: 'row', gap: 14 }}>{options.map(provider => <Image key={provider.id} source={{ uri: provider.icon }} accessibilityLabel={provider.name} accessible contentFit="contain" style={{ width: 28, height: 28 }} />)}</View>
    <Text style={{ color: colors.textName, fontSize: 19, fontWeight: '600', letterSpacing: -0.3 }}>{email ? 'Your inbox, in a few lines' : 'Your day, all here'}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 23 }}>{email ? 'Connect Gmail or Outlook for a daily email briefing.' : 'Connect Google Calendar or Outlook to bring your appointments into Repeat AI.'}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setError(''); setOpen(true); }} style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.textName, opacity: pressed || busy ? 0.7 : 1 })}>
      <Text style={{ color: colors.bg, fontWeight: '600', fontSize: 14 }}>{email ? 'Connect email' : 'Connect calendar'}</Text>
      {busy ? <ActivityIndicator size="small" color={colors.bg} /> : <AppIcon name="chevron" size={16} color={colors.bg} />}
    </Pressable>
    <BottomSheet visible={open} onClose={() => setOpen(false)} onDismiss={afterDismiss} colors={colors}>
      <View style={{ padding: 24, paddingTop: 8, gap: 14 }}>
        <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 21, fontWeight: '600', marginBottom: 8 }}>{email ? 'Connect email' : 'Connect calendar'}</Text>
        {options.map(provider => {
          const configured = connections.some(item => item.provider === provider.id && item.feature === feature && item.configured);
          return <Pressable key={provider.id} accessibilityRole="button" accessibilityLabel={`Connect ${provider.name}`} disabled={!configured || busy} onPress={() => choose(provider.id)} style={({ pressed }) => ({ minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed || !configured ? 0.5 : 1 })}>
            <Image source={{ uri: provider.icon }} contentFit="contain" style={{ width: 30, height: 30 }} />
            <Text style={{ flex: 1, color: colors.textName, fontSize: 17 }}>{provider.name}</Text>
            {!configured ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>Unavailable</Text> : <AppIcon name="chevron" size={18} color={colors.textMuted} />}
          </Pressable>;
        })}
        {error ? <Text accessibilityRole="alert" style={{ color: colors.errorText, fontSize: 14 }}>{error}</Text> : null}
      </View>
    </BottomSheet>
  </View>;
}
