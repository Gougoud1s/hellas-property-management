-- Per-unit occupant counts for person-based common-expense allocation.
-- Run after supabase_0005_corrective_statements.sql.

alter table public.units
  add column if not exists occupants integer not null default 1
  check (occupants >= 0);

update public.units
set occupants = 0
where resident_type = 'Κενό';
