update public.buildings
set location_name = case key
  when 'boulevardheights' then 'BLVD Heights'
  when 'downtownviews' then 'Downtown Views'
  when 'peninsulatwo' then 'Peninsula Two'
  when 'vidadubaimall' then 'Vida Dubai Mall'
  else location_name
end
where key in ('boulevardheights', 'downtownviews', 'peninsulatwo', 'vidadubaimall')
  and (
    location_name is null
    or btrim(location_name) = ''
    or btrim(location_name) = '0'
    or location_name ~ '^[0-9]+$'
  );
