import { Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';
import HomeConnectionPrompt from './home-connection-prompt';
import { Image } from 'expo-image';
import { HOME_PROVIDERS } from './home-integration-providers';

const SAMPLE_EVENTS = [
  { time: '10:00', title: 'Viewing at Burj Vista', location: 'Downtown Dubai' },
  { time: '14:30', title: 'Market appraisal with Sarah', location: 'Dubai Marina' },
  { time: '16:00', title: 'Catch-up with the team', location: 'Office' },
];

export default function CalendarPreview({ colors, connected, ready, userId, connections = [] }) {
  const providers = HOME_PROVIDERS.calendar.filter(provider => connections.some(item => item.provider === provider.id && item.feature === 'calendar' && item.connected));
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {providers.length ? providers.map(provider => <Image key={provider.id} source={{ uri: provider.icon }} accessibilityLabel={provider.name} accessible contentFit="contain" style={{ width: 24, height: 24 }} />) : <AppIcon name="calendar" size={24} color={colors.textName} />}
      <Text accessibilityRole="header" style={{ flex: 1, color: colors.textName, fontSize: 18, fontWeight: '600' }}>Today</Text>
      <Text accessibilityLabel="Sample appointments" style={{ color: colors.textMuted, fontSize: 12 }}>Sample</Text>
    </View>
    <View>
      {SAMPLE_EVENTS.map((event, index) => <View key={event.time} style={{ flexDirection: 'row', gap: 18, paddingVertical: 18, borderBottomWidth: index < SAMPLE_EVENTS.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
        <Text style={{ width: 48, color: colors.textMuted, fontSize: 14, fontVariant: ['tabular-nums'], paddingTop: 2 }}>{event.time}</Text>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: colors.textName, fontSize: 16, fontWeight: '500' }}>{event.title}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>{event.location}</Text>
        </View>
      </View>)}
    </View>
    {ready && !connected ? <HomeConnectionPrompt feature="calendar" colors={colors} userId={userId} connections={connections} /> : null}
  </View>;
}
