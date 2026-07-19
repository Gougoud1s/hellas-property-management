-- Publishing a property period or advancing its period refreshes every unit.
-- Run after supabase_0015_anastassiadis_demo_reconciliation.sql.
create or replace function public.refresh_property_balances_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare unit_record record;
begin
  if new.status is distinct from old.status or new.period is distinct from old.period then
    for unit_record in select id from public.units where property_id = new.id loop
      perform public.refresh_unit_financial_balance(unit_record.id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_refresh_period_balances on public.properties;
create trigger properties_refresh_period_balances
after update of status, period on public.properties
for each row execute function public.refresh_property_balances_trigger();
