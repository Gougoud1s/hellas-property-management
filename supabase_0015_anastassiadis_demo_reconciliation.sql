-- Pre-launch correction of synthetic Anastassiadis demo records.
-- No real customer financial history exists at the time of this migration.
begin;
set local session_replication_role = replica;

update public.statements s set
  previous_balance = v.previous_balance,
  current_charges = v.current_charges,
  total_due = v.total_due
from (values
  ('A1', 38.50::numeric, 105.46::numeric, 143.96::numeric),
  ('A2', 0, 85.22, 85.22),
  ('B1', 92.10, 124.03, 216.13),
  ('B2', 0, 69.94, 69.94),
  ('C1', 110, 76.57, 186.57),
  ('C2', 0, 90.18, 90.18)
) as v(code, previous_balance, current_charges, total_due),
public.units u, public.properties p
where u.code = v.code and u.property_id = s.property_id
  and p.id = s.property_id and p.code = 'ANA-IL-01'
  and s.unit_id = u.id and s.period = 'Ιούλιος 2026';

insert into public.statements (
  id, tenant_id, property_id, unit_id, period, previous_balance,
  current_charges, total_due, status, published_at
)
select gen_random_uuid(), p.tenant_id, p.id, u.id, 'Ιούλιος 2026',
  case u.code when 'G2' then 72.50 else 0 end,
  case u.code when 'G1' then 218.24 when 'G2' then 221.76 end,
  case u.code when 'G1' then 218.24 when 'G2' then 294.26 end,
  'published', '2026-07-12T09:00:00Z'
from public.properties p join public.units u on u.property_id = p.id
where p.code = 'ANA-GL-02' and u.code in ('G1','G2')
on conflict (unit_id, period) do update set
  previous_balance = excluded.previous_balance,
  current_charges = excluded.current_charges,
  total_due = excluded.total_due,
  status = excluded.status,
  published_at = excluded.published_at;

delete from public.payment_ledger where payment_code = 'ANA-IL-A2-0726';
update public.payment_ledger set amount = 90.18, period = 'Ιούλιος 2026'
where payment_code = 'ANA-IL-C2-0726';
update public.payment_ledger set period = 'Ιούλιος 2026'
where payment_code = 'ANA-GL-G1-0726';

set local session_replication_role = origin;

do $$ declare unit_record record; begin
  for unit_record in
    select u.id from public.units u join public.tenants t on t.id = u.tenant_id
    where t.slug = 'anastassiadis-group'
  loop
    perform public.refresh_unit_financial_balance(unit_record.id);
  end loop;
end $$;

insert into public.audit_events (
  tenant_id, action, resource_type, resource_id, metadata
)
select id, 'prelaunch_demo_financial_reconciliation', 'tenant', id::text,
  jsonb_build_object('period', 'Ιούλιος 2026', 'reason', 'Align synthetic statements, payments and unit balances before customer data import')
from public.tenants where slug = 'anastassiadis-group';

commit;
