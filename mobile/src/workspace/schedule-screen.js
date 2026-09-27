import { useBuildingSchedule } from '../../../shared/use-building-schedule';
import { supabase } from '../supabase';
import ScheduleEditor from './schedule-editor';

export default function ScheduleScreen({ userId, colors }) {
  const state = useBuildingSchedule(supabase, userId);
  return <ScheduleEditor key={userId} state={state} colors={colors} />;
}
