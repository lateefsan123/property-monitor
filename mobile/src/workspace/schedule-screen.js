import { useBuildingSchedule } from '../../../shared/use-building-schedule';
import { supabase } from '../supabase';
import { useSpreadsheetBuildings } from './use-spreadsheet-buildings';
import ScheduleEditor from './schedule-editor';

export default function ScheduleScreen({ userId, colors }) {
  const spreadsheets = useSpreadsheetBuildings(userId);
  const state = useBuildingSchedule(supabase, userId, spreadsheets);
  return <ScheduleEditor key={userId} state={state} spreadsheets={spreadsheets} colors={colors} />;
}
