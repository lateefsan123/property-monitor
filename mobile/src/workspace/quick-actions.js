import { Pressable, ScrollView, Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';

const actions = [
  { title: 'Import spreadsheet', detail: 'Bring in your sellers', icon: 'table', page: 'spreadsheets', request: { add: true } },
  { title: 'Search listings', detail: 'Find properties and price changes', icon: 'search', page: 'listing-alerts', request: { search: true } },
  { title: 'Sellers', detail: 'Open your contacts', icon: 'person', page: 'sellers', request: { add: false } },
  { title: 'Message templates', detail: 'Create and edit your messages', icon: 'message', page: 'message-template', request: {} },
];
export default function QuickActions({ colors, onAction, onClose }) {
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 12 }}>
      <Text accessibilityRole="header" style={{ flex: 1, color: colors.textName, fontSize: 23, fontWeight: '600' }}>Quick actions</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close quick actions" onPress={onClose} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgBadge, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><AppIcon name="close" color={colors.textMuted} size={20} /></Pressable>
    </View>
    <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
      {actions.map(action => <Pressable key={action.page} accessibilityRole="button" onPress={() => onAction(action.page, action.request)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, minHeight: 76, borderRadius: 16, backgroundColor: pressed ? colors.bgBadge : 'transparent' })}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}><AppIcon name={action.icon} size={23} color={colors.text} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.textName, fontSize: 16, fontWeight: '600' }}>{action.title}</Text><Text style={{ color: colors.textMuted, fontSize: 13 }}>{action.detail}</Text></View>
        <AppIcon name="chevron" size={18} color={colors.textFaint} />
      </Pressable>)}
    </ScrollView>
  </>;
}
