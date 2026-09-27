import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { dubaiDateKey } from '../../../shared/send-activity-dates';
import AppIcon from '../components/AppIcon';

const SOURCES = { auto: ['Automated', 'flash'], bulk: ['Bulk messages', 'users'], manual: ['Manual', 'message'], mcp: ['Integrations', 'link'], other: ['Other', 'more'] };
const label = value => String(value).replace(/[_-]/g, ' ').replace(/^./, char => char.toUpperCase());

function CountRow({ title, count, icon, colors, last }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}><AppIcon name={icon} size={17} color={colors.textMuted} /></View>
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 14, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{title}</Text>
      <Text selectable style={{ fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.text }}>{count}</Text>
    </View>
  </View>;
}

export default function SendActivitySummary({ data, colors, refreshing, onRefresh }) {
  const isToday = !data.startDate || (data.startDate === dubaiDateKey() && data.endDate === data.startDate);
  const sources = Object.entries(data.sources).filter(([, count]) => count > 0);
  const origins = Object.entries(data.origins).filter(([, count]) => count > 0);
  return <View style={{ gap: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ gap: 4 }}><Text accessibilityRole="header" style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{data.startDate ? 'Overview' : 'Today'}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>Dubai time</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh activity" accessibilityState={{ disabled: refreshing, busy: refreshing }} disabled={refreshing} onPress={onRefresh} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        {refreshing ? <ActivityIndicator size="small" color={colors.textMuted} /> : <AppIcon name="refresh" size={20} color={colors.textMuted} />}
      </Pressable>
    </View>
    <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 18, paddingVertical: 24 }}>
      {[[data.total, 'Messages sent'], [data.distinctLeads, 'Sellers contacted']].map(([count, title], index) => <View key={title} style={{ flex: 1, paddingHorizontal: 20, gap: 8, borderLeftWidth: index ? StyleSheet.hairlineWidth : 0, borderColor: colors.border }}>
        <Text selectable style={{ color: colors.textName, fontSize: 32, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{count}</Text><Text style={{ color: colors.textMuted, fontSize: 13 }}>{title}</Text>
      </View>)}
    </View>
    {data.total === 0 ? <View style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }}>
      <AppIcon name="message" size={30} color={colors.textFaint} /><Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{isToday ? 'No messages sent today' : 'No messages in this period'}</Text><Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 }}>Your sending activity will appear here.</Text>
    </View> : <>
      <View style={{ gap: 10 }}><Text accessibilityRole="header" style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>Message activity</Text>
        <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, overflow: 'hidden' }}>{sources.map(([key, count], index) => <CountRow key={key} title={SOURCES[key]?.[0] || label(key)} icon={SOURCES[key]?.[1] || 'message'} count={count} colors={colors} last={index === sources.length - 1} />)}</View>
      </View>
      {origins.length ? <View style={{ gap: 10 }}><Text accessibilityRole="header" style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>Sent from</Text><View style={{ backgroundColor: colors.bgCard, borderRadius: 16, overflow: 'hidden' }}>{origins.map(([key, count], index) => <CountRow key={key} title={label(key)} icon="external" count={count} colors={colors} last={index === origins.length - 1} />)}</View></View> : null}
    </>}
    {data.alerts.map(alert => <View key={alert.id} accessibilityRole="alert" style={{ backgroundColor: colors.errorBg, borderRadius: 14, padding: 16, gap: 6 }}><Text style={{ color: colors.errorText, fontSize: 14, fontWeight: '600' }}>{label(alert.alert_type)}</Text><Text style={{ color: colors.errorText, fontSize: 13 }}>{alert.observed_count} messages · {label(alert.severity)}</Text></View>)}
  </View>;
}
