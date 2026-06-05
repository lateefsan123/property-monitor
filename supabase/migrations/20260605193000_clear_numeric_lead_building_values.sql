update public.leads
set
  notes = nullif(
    trim(both E'\n' from concat_ws(
      E'\n',
      nullif(notes, ''),
      'Removed invalid building value: ' || building
    )),
    ''
  ),
  building = null
where coalesce(building, '') <> ''
  and building !~ '[A-Za-z]'
  and length(regexp_replace(building, '[^0-9]', '', 'g')) >= 7;
