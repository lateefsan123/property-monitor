import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';
import { Feedback } from './ui';

const names = { google: 'Gmail', microsoft: 'Outlook' };

export default function EmailSummaryCard({ query, colors }) {
  const [expanded, setExpanded] = useState(false);
  const data = query.data;
  const summary = data?.summary;
  const working = query.generate.isPending || data?.status === 'processing';
  const source = (data?.providers || []).map(provider => names[provider]).join(' + ');
  const error = query.error || query.configure.error || query.generate.error;
  return <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.bgCard, overflow: 'hidden' }}>
    <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bgHover, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="calendar" color={colors.textName} size={21} /></View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 16, fontWeight: '600' }}>Your daily email briefing</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Daily · 8:00 AM Dubai</Text>
      </View>
      {data ? <Switch accessibilityLabel="Daily email summaries" value={data.enabled} disabled={query.configure.isPending || (!data.available && !data.enabled)} onValueChange={value => query.configure.mutate(value)} /> : null}
    </View>
    <View style={{ padding: 18, paddingTop: 0, gap: 14 }}>
      <Feedback colors={colors} loading={query.isPending} error={error} onRetry={query.retry} />
      {data && !data.available ? <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>Email summaries are not available yet. Please try again later.</Text> : null}
      {data && !data.enabled ? <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>Turn on a short AI briefing of up to 10 recent emails from {source}. Their text is sent to OpenAI to prepare your summary.</Text> : null}
      {working ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: 14 }}>Preparing your briefing…</Text> : null}
      {data?.error ? <Text accessibilityRole="alert" style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>{data.error}</Text> : null}
      {data?.enabled && !summary && !working && !data.error && data.available ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Your daily briefing will appear here.</Text> : null}
      {summary ? <>
        <View style={{ gap: 9 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{new Date(`${summary.day}T04:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' })} · {summary.emailCount} {summary.emailCount === 1 ? 'email' : 'emails'} · {source}</Text>
          <Text selectable style={{ color: colors.textName, fontSize: 16, lineHeight: 25 }}>{summary.overview}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>24 hours ending 8 AM Dubai{summary.hasMore ? ' · Showing the 10 most recent emails' : ''} · Attachments excluded</Text>
        </View>
        {summary.items.length ? <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ flexDirection: 'row', minHeight: 44, alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          <Text style={{ color: colors.textName, fontSize: 14, fontWeight: '500' }}>{expanded ? 'Hide emails' : `View ${summary.emailCount} ${summary.emailCount === 1 ? 'email' : 'emails'}`}</Text>
          <AppIcon name={expanded ? 'arrowUp' : 'chevron'} color={colors.textMuted} size={17} />
        </Pressable> : null}
        {expanded ? summary.items.map((item, index) => <View key={`${summary.day}:${index}`} style={{ gap: 6, borderTopWidth: index ? 1 : 0, borderTopColor: colors.borderLight, paddingTop: index ? 14 : 0 }}>
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>{item.from || names[item.provider]}</Text>
          <Text style={{ color: colors.textName, fontSize: 14, fontWeight: '600' }}>{item.subject || 'No subject'}</Text>
          <Text selectable style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{item.summary}</Text>
          {item.partial ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>Based on an excerpt</Text> : null}
        </View>) : null}
      </> : null}
    </View>
  </View>;
}
