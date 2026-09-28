import { Alert, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feedback } from './ui';

const providers = {
  google: { name: 'Gmail', logo: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png' },
  microsoft: { name: 'Outlook', logo: 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png' },
};
const sampleOverview = 'Your dentist appointment is tomorrow at 10 AM, your parcel is due this afternoon, and Alex is asking if you’re free for dinner on Friday.';

export default function EmailSummaryCard({ query, colors, connectedProviders = [] }) {
  const data = query.data;
  const summary = data?.summary;
  const working = query.generate.isPending || data?.status === 'processing';
  const error = query.error || query.configure.error || query.generate.error;
  function setEnabled(enabled) {
    if (!enabled) return query.configure.mutate(false);
    Alert.alert('Enable daily summaries?', 'Text from up to 10 recent emails is sent to OpenAI for your daily briefing. Attachments are excluded.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Enable', onPress: () => query.configure.mutate(true) },
    ]);
  }
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {(data?.providers || connectedProviders).filter(provider => providers[provider]).map(provider => <Image key={provider}
        source={{ uri: providers[provider].logo }} accessibilityLabel={providers[provider].name} accessible
        contentFit="contain" style={{ width: 24, height: 24 }} />)}
      <Text accessibilityRole="header" style={{ flex: 1, color: colors.textName, fontSize: 18, fontWeight: '600', letterSpacing: -0.3 }}>{summary ? 'Your daily brief' : 'Sample brief'}</Text>
      {data ? <Switch accessibilityLabel="Daily email summaries" value={data.enabled} disabled={query.configure.isPending || (!data.available && !data.enabled)} onValueChange={setEnabled} /> : null}
    </View>
    <Feedback colors={colors} loading={query.isPending} error={error} onRetry={query.retry} />
    {data && !data.available ? <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>Email summaries are not available yet. Please try again later.</Text> : null}
    {working ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: 14 }}>Preparing your briefing…</Text> : null}
    {data?.error ? <Text accessibilityRole="alert" style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>{data.error}</Text> : null}
    <Text selectable style={{ color: colors.textName, fontSize: 16, lineHeight: 26 }}>{summary?.overview || sampleOverview}</Text>
  </View>;
}
