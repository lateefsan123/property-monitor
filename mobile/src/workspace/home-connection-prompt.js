import { Pressable, Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';

export default function HomeConnectionPrompt({ feature, colors, onConnect }) {
  const email = feature === 'email';
  return <View style={{ gap: 14, paddingVertical: 12 }}>
    <Text style={{ color: colors.textName, fontSize: 19, fontWeight: '600', letterSpacing: -0.3 }}>{email ? 'Your inbox, in a few lines' : 'Your day, all here'}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 23 }}>{email ? 'Connect Gmail or Outlook for a daily email briefing.' : 'Connect Google Calendar or Outlook to bring your appointments into Repeat AI.'}</Text>
    <Pressable accessibilityRole="button" onPress={onConnect} style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.textName, opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ color: colors.bg, fontWeight: '600', fontSize: 14 }}>{email ? 'Connect email' : 'Connect calendar'}</Text>
      <AppIcon name="chevron" size={16} color={colors.bg} />
    </Pressable>
  </View>;
}
