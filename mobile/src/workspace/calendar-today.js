import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HOME_PROVIDERS } from './home-integration-providers';
import HomeConnectionPrompt from './home-connection-prompt';
import { integrationRequest } from './integration-client';
import { connectIntegration } from './integration-connect';
import { calendarDay, calendarTime } from '../../../shared/calendar-day';
import { canUsePrivateAssistant } from '../../../shared/assistant-access';
import { Feedback } from './ui';

const SHORTCUTS = [
  ['Check my day', 'What is on my connected calendar today? Use Dubai time.'],
  ['Add a viewing', 'Help me add a property viewing to my connected calendar. Ask me for the date, time, duration and location.'],
  ['Add a reminder', 'Help me add a calendar event with a reminder. Ask what it is for, when, and how early I want the alert.'],
];

export default function CalendarToday({ userId, colors, connections, connectionError, retryConnections, onAskRepeat }) {
  const cache = useQueryClient();
  const [clock, setClock] = useState(Date.now);
  const [upgrading, setUpgrading] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const window = calendarDay(clock);
  const connected = (connections || []).filter(item => item.feature === 'calendar' && item.connected);
  const providerKey = connected.map(item => item.provider).sort().join(',');
  const query = useQuery({
    queryKey: ['calendar-today', userId, providerKey, window.day],
    enabled: Boolean(userId && providerKey), staleTime: 30000, refetchInterval: providerKey ? 60000 : false,
    queryFn: async ({ signal }) => Promise.all(providerKey.split(',').map(async provider => {
      try { return { provider, ...await integrationRequest({ action: 'read', provider, feature: 'calendar', input: { start: window.start, end: window.end } }, signal, userId) }; }
      catch (failure) { if (signal.aborted) throw failure; return { provider, error: failure.message }; }
    })),
  });
  async function upgrade(provider) {
    if (upgrading) return;
    setUpgrading(provider); setError('');
    try {
      await connectIntegration(provider, 'calendar', 'events', userId);
      await cache.invalidateQueries({ queryKey: ['integration-connections', userId], exact: true });
    } catch (failure) { setError(failure.message); }
    finally { setUpgrading(''); }
  }
  if (!connections) return <Feedback colors={colors} loading={!connectionError} error={connectionError} onRetry={retryConnections} />;
  if (!connected.length) return <HomeConnectionPrompt feature="calendar" userId={userId} colors={colors} connections={connections} />;
  const results = query.data || [];
  const events = results.flatMap(result => (result.items || []).map(event => ({ ...event, provider: result.provider })))
    .sort((a, b) => Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) || calendarTime(a).localeCompare(calendarTime(b)));
  const failure = results.find(result => result.error)?.error || query.error || error;
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {HOME_PROVIDERS.calendar.filter(provider => connected.some(item => item.provider === provider.id)).map(provider => <Image key={provider.id} source={{ uri: provider.icon }} accessibilityLabel={provider.name} accessible contentFit="contain" style={{ width: 24, height: 24 }} />)}
      <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 18, fontWeight: '600' }}>Today</Text>
    </View>
    <Feedback colors={colors} loading={query.isPending} error={failure} onRetry={() => { setError(''); void query.refetch(); }} />
    {events.map(event => <View key={`${event.provider}:${event.id}`} style={{ flexDirection: 'row', gap: 16, paddingVertical: 12 }}>
      <Text style={{ width: 52, color: colors.textMuted, fontSize: 14, fontVariant: ['tabular-nums'], paddingTop: 2 }}>{calendarTime(event)}</Text>
      <View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.textName, fontSize: 16, fontWeight: '500' }}>{event.title || 'Untitled event'}</Text>{event.location ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>{event.location}</Text> : null}</View>
    </View>)}
    {!query.isPending && !failure && !events.length ? <Text style={{ color: colors.textMuted, fontSize: 15 }}>No appointments today.</Text> : null}
    {results.some(result => result.hasMore) ? <Text style={{ color: colors.textMuted }}>More events are available in your calendar app.</Text> : null}
    {canUsePrivateAssistant(userId) ? <View style={{ gap: 12 }}>
      <Text style={{ color: colors.textName, fontSize: 16, fontWeight: '600' }}>Ask Repeat</Text>
      {SHORTCUTS.map(([label, prompt]) => <Pressable key={label} accessibilityRole="button" onPress={() => onAskRepeat(prompt)} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.bgBadge, opacity: pressed ? 0.65 : 1 })}><Text style={{ color: colors.textName, fontSize: 14 }}>{label}</Text></Pressable>)}
      {connected.filter(item => !item.canWriteCalendar).map(item => <Pressable key={item.provider} accessibilityRole="button" disabled={Boolean(upgrading)} onPress={() => upgrade(item.provider)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.textName, fontSize: 14 }}>{upgrading === item.provider ? 'Connecting…' : `Enable adding events · ${item.provider === 'google' ? 'Google Calendar' : 'Outlook'}`}</Text></Pressable>)}
    </View> : null}
  </View>;
}
