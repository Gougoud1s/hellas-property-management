-- Keep per-person allocations valid for every existing and newly-created unit.
update public.units
set occupants = 0
where resident_type = 'Κενό';

update public.units
set occupants = 1
where resident_type <> 'Κενό' and occupants < 1;

alter table public.units
  drop constraint if exists units_occupants_residency_check;

alter table public.units
  add constraint units_occupants_residency_check check (
    (resident_type = 'Κενό' and occupants = 0)
    or (resident_type <> 'Κενό' and occupants >= 1)
  );
