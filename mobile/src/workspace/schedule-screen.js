import { useBuildingSchedule } from '../../../shared/use-building-schedule';
import { supabase } from '../supabase';
import ScheduleEditor from './schedule-editor';

export default function ScheduleScreen({ userId, colors, onNavigate }) {
  const state = useBuildingSchedule(supabase, userId);
  return <ScheduleEditor key={userId} state={state} colors={colors} onImport={onNavigate ? () => onNavigate('spreadsheets', { add: true }) : undefined} />;
}
