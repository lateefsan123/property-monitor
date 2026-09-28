import { StyleSheet, Text, View } from 'react-native';
import { dubaiDateKey } from '../../../shared/send-activity-dates';
import { describeSendAlerts } from '../../../shared/send-alert-copy';
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

export default function SendActivitySummary({ data, colors }) {
  const isToday = !data.startDate || (data.startDate === dubaiDateKey() && data.endDate === data.startDate);
  const sources = Object.entries(data.sources).filter(([, count]) => count > 0);
  const origins = Object.entries(data.origins).filter(([, count]) => count > 0);
  const warnings = describeSendAlerts((data.alerts || []).filter(alert => alert.alert_type === 'rapid_repeat'), !isToday);
  return <View style={{ gap: 24 }}>
    {warnings.map(warning => <View key={warning.key} accessibilityRole="alert" style={{ flexDirection: 'row', gap: 12, backgroundColor: warning.tone === 'red' ? colors.errorBg : colors.badgeDueBg, borderRadius: 14, padding: 16 }}>
      <AppIcon name="alert" size={20} color={warning.tone === 'red' ? colors.errorText : colors.badgeDueText} />
      <View style={{ flex: 1, gap: 4 }}><Text style={{ color: warning.tone === 'red' ? colors.errorText : colors.badgeDueText, fontSize: 14, fontWeight: '600' }}>{warning.title}</Text><Text style={{ color: warning.tone === 'red' ? colors.errorText : colors.badgeDueText, fontSize: 13, lineHeight: 19 }}>{warning.body}</Text></View>
    </View>)}
    <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 18, paddingVertical: 24 }}>
      {[[data.total, 'Messages sent'], [data.distinctLeads, 'Sellers contacted']].map(([count, title], index) => <View key={title} style={{ flex: 1, paddingHorizontal: 20, gap: 8, borderLeftWidth: index ? StyleSheet.hairlineWidth : 0, borderColor: colors.border }}>
        <Text selectable style={{ color: colors.textName, fontSize: 32, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{count}</Text><Text style={{ color: colors.textMuted, fontSize: 13 }}>{title}</Text>
      </View>)}
    </View>
    {data.total > 0 ? <>
      <View style={{ gap: 10 }}><Text accessibilityRole="header" style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>Message activity</Text>
        <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, overflow: 'hidden' }}>{sources.map(([key, count], index) => <CountRow key={key} title={SOURCES[key]?.[0] || label(key)} icon={SOURCES[key]?.[1] || 'message'} count={count} colors={colors} last={index === sources.length - 1} />)}</View>
      </View>
      {origins.length ? <View style={{ gap: 10 }}><Text accessibilityRole="header" style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>Sent from</Text><View style={{ backgroundColor: colors.bgCard, borderRadius: 16, overflow: 'hidden' }}>{origins.map(([key, count], index) => <CountRow key={key} title={label(key)} icon="external" count={count} colors={colors} last={index === origins.length - 1} />)}</View></View> : null}
    </> : null}
  </View>;
}
