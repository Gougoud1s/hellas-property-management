-- One financial truth: issued statements/corrections minus completed payments.
-- Run after supabase_0013_private_branding.sql.

alter table public.payment_ledger add column if not exists period text;
update public.payment_ledger l set period = p.period
from public.properties p where p.id = l.property_id and l.period is null;
alter table public.payment_ledger alter column period set not null;
create index if not exists payment_ledger_unit_period_idx
  on public.payment_ledger (unit_id, period) where status = 'Ολοκληρώθηκε';

create or replace function public.refresh_unit_financial_balance(target_unit_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  unit_row public.units%rowtype;
  property_row public.properties%rowtype;
  statement_total numeric := 0;
  correction_total numeric := 0;
  paid_total numeric := 0;
  next_balance numeric := 0;
begin
  select * into unit_row from public.units where id = target_unit_id for update;
  if not found then return 0; end if;
  select * into property_row from public.properties where id = unit_row.property_id;

  if property_row.status = 'Published' then
    select coalesce(s.total_due, unit_row.prev_balance) into statement_total
    from public.statements s
    where s.unit_id = unit_row.id and s.period = property_row.period and s.status = 'published'
    order by s.published_at desc nulls last limit 1;
    statement_total := coalesce(statement_total, unit_row.prev_balance);

    select coalesce(sum(coalesce(nullif(b.unit_charges ->> unit_row.code, '')::numeric, 0)), 0)
      into correction_total
    from public.statement_batches b
    where b.property_id = property_row.id and b.period = property_row.period and b.kind = 'correction';

    select coalesce(sum(l.amount), 0) into paid_total
    from public.payment_ledger l
    where l.unit_id = unit_row.id and l.period = property_row.period and l.status = 'Ολοκληρώθηκε';

    next_balance := greatest(0, round((statement_total + correction_total - paid_total)::numeric, 2));
  else
    next_balance := round(unit_row.prev_balance::numeric, 2);
  end if;

  update public.units set balance = next_balance where id = unit_row.id;
  update public.properties p set dues = (
    select coalesce(round(sum(greatest(u.balance, 0))::numeric, 2), 0)
    from public.units u where u.property_id = p.id
  ) where p.id = unit_row.property_id;
  return next_balance;
end;
$$;

revoke all on function public.refresh_unit_financial_balance(uuid) from public, anon, authenticated;
grant execute on function public.refresh_unit_financial_balance(uuid) to service_role;

create or replace function public.refresh_financial_balance_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if tg_op = 'DELETE' then target := old.unit_id; else target := new.unit_id; end if;
  perform public.refresh_unit_financial_balance(target);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists payment_ledger_refresh_balance on public.payment_ledger;
create trigger payment_ledger_refresh_balance
after insert or update or delete on public.payment_ledger
for each row execute function public.refresh_financial_balance_trigger();

create or replace function public.refresh_statement_balance_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_unit_financial_balance(new.unit_id);
  return new;
end;
$$;

drop trigger if exists statements_refresh_balance on public.statements;
create trigger statements_refresh_balance
after insert or update on public.statements
for each row execute function public.refresh_statement_balance_trigger();

create or replace function public.refresh_batch_balances_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare unit_record record;
begin
  for unit_record in select id from public.units where property_id = new.property_id loop
    perform public.refresh_unit_financial_balance(unit_record.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists statement_batches_refresh_balances on public.statement_batches;
create trigger statement_batches_refresh_balances
after insert on public.statement_batches
for each row execute function public.refresh_batch_balances_trigger();

-- Company users may edit unit identity/allocation data, never financial truth.
revoke insert, update on public.units from authenticated;
grant insert (tenant_id, property_id, code, floor, type, size, share, coefficient,
  owner_name, owner_phone, owner_email, resident_name, resident_type, occupants,
  participation_start, participation_end, participation_policy, status, deposit)
on public.units to authenticated;
grant update (floor, type, size, share, coefficient, owner_name, owner_phone, owner_email,
  resident_name, resident_type, occupants, participation_start, participation_end,
  participation_policy, status, deposit)
on public.units to authenticated;

create or replace function public.post_property_payment(
  target_property_code text, target_unit_code text, payment_amount numeric,
  payment_payer text, payment_method public.payment_method, payment_reference text,
  source_bank_transaction_id uuid default null
)
returns public.payment_ledger
language plpgsql security definer set search_path = public as $$
declare
  tenant_uuid uuid := public.current_tenant_id();
  property_row public.properties%rowtype;
  unit_row public.units%rowtype;
  ledger_row public.payment_ledger%rowtype;
begin
  if tenant_uuid is null then raise exception 'Unauthenticated'; end if;
  if not public.is_company_user() then raise exception 'Insufficient permissions'; end if;
  if payment_amount <= 0 or payment_amount > 50000 then raise exception 'Invalid payment amount'; end if;
  select * into property_row from public.properties where tenant_id = tenant_uuid and code = target_property_code for update;
  if not found then raise exception 'Property not found'; end if;
  select * into unit_row from public.units where tenant_id = tenant_uuid and property_id = property_row.id and code = target_unit_code for update;
  if not found then raise exception 'Unit not found'; end if;
  if payment_amount > greatest(unit_row.balance, 0) then raise exception 'Payment exceeds outstanding balance'; end if;

  if source_bank_transaction_id is not null then
    update public.bank_transactions set reconciled_at = now()
    where id = source_bank_transaction_id and tenant_id = tenant_uuid
      and property_id = property_row.id and reconciled_at is null;
    if not found then raise exception 'Bank transaction unavailable'; end if;
  end if;

  update public.properties set cash_available = round((cash_available + payment_amount)::numeric, 2)
  where id = property_row.id;
  insert into public.payment_ledger (
    tenant_id, property_id, unit_id, period, paid_at, payer, payment_code,
    amount, method, match_type, status
  ) values (
    tenant_uuid, property_row.id, unit_row.id, property_row.period, current_date,
    payment_payer, payment_reference, payment_amount, payment_method,
    'ΧΕΙΡΟΚΙΝΗΤΗ', 'Ολοκληρώθηκε'
  ) returning * into ledger_row;
  return ledger_row;
end;
$$;
revoke all on function public.post_property_payment(text,text,numeric,text,public.payment_method,text,uuid) from public;
grant execute on function public.post_property_payment(text,text,numeric,text,public.payment_method,text,uuid) to authenticated;

create or replace function public.settle_provider_payment(
  target_order_code text, target_transaction_id text, confirmed_amount numeric
)
returns public.payment_ledger
language plpgsql security definer set search_path = public as $$
declare
  payment_order public.payment_orders%rowtype;
  ledger_row public.payment_ledger%rowtype;
begin
  select * into payment_order from public.payment_orders
  where provider = 'viva' and provider_order_code = target_order_code for update;
  if not found then raise exception 'Payment order not found'; end if;
  if payment_order.status = 'paid' then
    select * into ledger_row from public.payment_ledger
    where tenant_id = payment_order.tenant_id and payment_code = target_transaction_id;
    return ledger_row;
  end if;
  if confirmed_amount <> payment_order.amount then raise exception 'Payment amount mismatch'; end if;
  if exists (select 1 from public.payment_orders where provider = 'viva' and paid_transaction_id = target_transaction_id) then
    raise exception 'Transaction already processed';
  end if;

  update public.properties set cash_available = round((cash_available + confirmed_amount)::numeric, 2)
  where id = payment_order.property_id;
  insert into public.payment_ledger (
    tenant_id, property_id, unit_id, period, paid_at, payer, payment_code,
    amount, method, match_type, status
  ) values (
    payment_order.tenant_id, payment_order.property_id, payment_order.unit_id,
    payment_order.period, current_date, payment_order.payer_name, target_transaction_id,
    confirmed_amount, 'Κάρτα', 'ΑΥΤΟΜΑΤΗ', 'Ολοκληρώθηκε'
  ) returning * into ledger_row;
  update public.payment_orders set status = 'paid', paid_transaction_id = target_transaction_id,
    paid_at = now(), updated_at = now() where id = payment_order.id;
  return ledger_row;
end;
$$;
revoke all on function public.settle_provider_payment(text,text,numeric) from public, anon, authenticated;
grant execute on function public.settle_provider_payment(text,text,numeric) to service_role;

do $$ declare unit_record record; begin
  for unit_record in select id from public.units loop
    perform public.refresh_unit_financial_balance(unit_record.id);
  end loop;
end $$;
