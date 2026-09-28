import { Switch, Text, View } from 'react-native';
import { Feedback } from './ui';

const names = { google: 'Gmail', microsoft: 'Outlook' };
const sampleOverview = 'Your dentist appointment is tomorrow at 10 AM, your parcel is due this afternoon, and Alex is asking if you’re free for dinner on Friday.';

export default function EmailSummaryCard({ query, colors }) {
  const data = query.data;
  const summary = data?.summary;
  const working = query.generate.isPending || data?.status === 'processing';
  const source = (data?.providers || []).map(provider => names[provider]).join(' + ');
  const error = query.error || query.configure.error || query.generate.error;
  return <View style={{ gap: 20 }}>
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 18, fontWeight: '600', letterSpacing: -0.3 }}>Your daily brief</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{summary
        ? `${new Date(`${summary.day}T04:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' })} · ${summary.emailCount} ${summary.emailCount === 1 ? 'email' : 'emails'} · ${source}`
        : 'Sample preview · Fictional emails'}</Text>
    </View>
    <Feedback colors={colors} loading={query.isPending} error={error} onRetry={query.retry} />
    {data && !data.available ? <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>Email summaries are not available yet. Please try again later.</Text> : null}
    {working ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: 14 }}>Preparing your briefing…</Text> : null}
    {data?.error ? <Text accessibilityRole="alert" style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>{data.error}</Text> : null}
    <Text selectable style={{ color: colors.textName, fontSize: 16, lineHeight: 26 }}>{summary?.overview || sampleOverview}</Text>
    {summary?.hasMore || summary?.items?.some(item => item.partial) ? <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{[summary.hasMore ? 'Based on the 10 most recent emails' : null, summary.items?.some(item => item.partial) ? 'Some messages were shortened' : null].filter(Boolean).join(' · ')}</Text> : null}
    {data ? <View style={{ gap: 10, paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 44 }}>
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: 12 }}>Daily · 8:00 AM Dubai{data.enabled ? '' : ' · Off'}</Text>
        <Switch accessibilityLabel="Daily email summaries" value={data.enabled} disabled={query.configure.isPending || (!data.available && !data.enabled)} onValueChange={value => query.configure.mutate(value)} />
      </View>
      {!data.enabled ? <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>Turn on to summarize up to 10 emails from {source}. Email text is sent to OpenAI; attachments are excluded.</Text> : null}
    </View> : null}
  </View>;
}
