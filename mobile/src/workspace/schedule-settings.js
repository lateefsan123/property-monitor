import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBuildingScheduleServices } from '../../../shared/building-schedule-services';
import { buildingScheduleOptions } from '../../../shared/building-schedule-queries';
import { emptySchedule } from '../../../supabase/functions/_shared/building-schedule';
import { supabase } from '../supabase';
import { SettingsToggle } from '../components/SettingsLayout';
import { Feedback } from './ui';

export function SchedulePreferences({ value, colors, disabled, onChange }) {
  return <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, paddingHorizontal: 16 }}>
    {[
      ['enabled', 'Weekly schedule', 'Use the days chosen for each building. Off returns to account-wide automation.'],
      ['fill_unused', 'Fill unused slots', 'Use other buildings when selected buildings run out. Empty days stay off.'],
    ].map(([key, title, description], index) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, borderTopWidth: index ? 0.5 : 0, borderColor: colors.border }}>
      <View style={{ flex: 1, gap: 6 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{title}</Text><Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>{description}</Text></View>
      <SettingsToggle colors={colors} accessibilityLabel={title} disabled={disabled} value={Boolean(value?.[key])} onValueChange={next => onChange({ ...value, [key]: next })} />
    </View>)}
  </View>;
}
export default function ScheduleSettings({ userId, colors }) {
  const cache = useQueryClient();
  const options = buildingScheduleOptions(supabase, userId).schedule;
  const query = useQuery(options);
  const mutation = useMutation({ mutationFn: value => createBuildingScheduleServices(supabase).savePreferences(userId, value),
    onSuccess: flags => cache.setQueryData(options.queryKey, previous => ({ ...(previous || emptySchedule()), ...flags })) });
  return <View style={{ gap: 16 }}>
    <Feedback colors={colors} error={query.error || mutation.error} loading={query.isPending} onRetry={() => { mutation.reset(); void query.refetch(); }} />
    <SchedulePreferences value={query.data} colors={colors} disabled={!query.data || query.isError || mutation.isPending} onChange={value => mutation.mutate(value)} />
    <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: 12 }}>{mutation.isPending ? 'Saving…' : 'Changes save automatically. All schedules use Dubai time.'}</Text>
  </View>;
}
