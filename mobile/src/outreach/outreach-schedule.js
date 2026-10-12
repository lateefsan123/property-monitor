import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';
import { outreachDailyLimit } from '../../../shared/email-outreach';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const RAMP = [['Week 1', 5], ['Week 2', 10], ['Week 3', 20], ['Week 4 onwards', 30]];

// When emails go out, in the original Schedule cards. The schedule is fixed on
// the server (weekdays, 9am–5pm Dubai, a slow daily ramp), so it is read-only.
export default function OutreachSchedule({ colors, outreach }) {
  const campaign = outreach.campaign.data;
  const [now] = useState(() => Date.now());
  const today = campaign?.rampStartedAt ? outreachDailyLimit(campaign.rampStartedAt, now) : null;
  const card = { padding: 16, gap: 12, borderRadius: 16, backgroundColor: colors.bgCard, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' };
  const title = { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' };
  const muted = { color: colors.textMuted, fontSize: 13, lineHeight: 19 };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 88 }}>
    <View style={card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={title}>Sending days</Text><AppIcon name="checkCircle" size={20} color={colors.badgeOkText} /></View>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {DAYS.map((day, index) => { const on = index < 5; return <View key={day} accessibilityLabel={`${day}, ${on ? 'sending' : 'off'}`} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: on ? colors.btnPrimaryBg : colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: on ? colors.btnPrimaryText : colors.textMuted }}>{day.slice(0, 2)}</Text>
          </View>
        </View>; })}
      </View>
      <Text style={muted}>9am – 5pm Dubai time, at least 30 minutes between emails.</Text>
    </View>
    <View style={card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={title}>Emails per day</Text>{today ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Today: {today}</Text> : null}</View>
      {RAMP.map(([label, count]) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, borderTopWidth: 0.5, borderTopColor: colors.border }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{label}</Text>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: today === count ? colors.btnPrimaryBg : colors.bgBadge }}>
          <Text style={{ color: today === count ? colors.btnPrimaryText : colors.text, fontSize: 12, fontVariant: ['tabular-nums'] }}>{count} a day</Text>
        </View>
      </View>)}
      <Text style={muted}>A slow start keeps a new inbox out of spam. Follow-ups count towards the daily limit.</Text>
    </View>
    <View style={card}>
      <Text style={title}>Follow-ups</Text>
      {[['Email 1', 'When the contact’s turn comes'], ['Email 2', '3 days after email 1'], ['Email 3', '7 days after email 2']].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, borderTopWidth: 0.5, borderTopColor: colors.border }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{label}</Text><Text style={{ color: colors.textMuted, fontSize: 14 }}>{value}</Text>
      </View>)}
      <Text style={muted}>Replies, “no” replies and bounces stop further emails. Unconfirmed sends pause the campaign for review.</Text>
    </View>
  </ScrollView>;
}
