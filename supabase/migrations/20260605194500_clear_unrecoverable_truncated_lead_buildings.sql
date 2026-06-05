update public.leads
set
  notes = nullif(
    trim(both E'\n' from concat_ws(
      E'\n',
      nullif(notes, ''),
      'Removed unrecoverable truncated building value: ' || building
    )),
    ''
  ),
  unit = coalesce(nullif(unit, ''), 'Unit ' || substring(building from '(?i)(?:Apartment|Apt|Flat|Unit)\s+([[:alnum:]-]+)')),
  building = null
where building in (
  'Apartment 1604(NOT LIVE), Execu…',
  'Apartment 701 (Not Live), Boulev…'
);
