-- Atomic payment posting. Run after supabase_0003_operations_upgrade.sql.
-- A ledger entry, unit balance update and bank reconciliation either all
-- succeed or all roll back. Tenant identity comes from the authenticated user.

create or replace function public.post_property_payment(
  target_property_code text,
  target_unit_code text,
  payment_amount numeric,
  payment_payer text,
  payment_method public.payment_method,
  payment_reference text,
  source_bank_transaction_id uuid default null
)
returns public.payment_ledger
language plpgsql
security invoker
set search_path = public
as $$
declare
  tenant_uuid uuid := public.current_tenant_id();
  property_row public.properties%rowtype;
  unit_row public.units%rowtype;
  ledger_row public.payment_ledger%rowtype;
begin
  if tenant_uuid is null then raise exception 'Unauthenticated'; end if;
  if not public.is_company_user() then raise exception 'Insufficient permissions'; end if;
  if payment_amount <= 0 or payment_amount > 50000 then raise exception 'Invalid payment amount'; end if;

  select * into property_row from public.properties
    where tenant_id = tenant_uuid and code = target_property_code for update;
  if not found then raise exception 'Property not found'; end if;

  select * into unit_row from public.units
    where tenant_id = tenant_uuid and property_id = property_row.id and code = target_unit_code for update;
  if not found then raise exception 'Unit not found'; end if;

  if source_bank_transaction_id is not null then
    update public.bank_transactions
      set reconciled_at = now()
      where id = source_bank_transaction_id
        and tenant_id = tenant_uuid
        and property_id = property_row.id
        and reconciled_at is null;
    if not found then raise exception 'Bank transaction unavailable'; end if;
  end if;

  update public.units
    set balance = round((balance - payment_amount)::numeric, 2)
    where id = unit_row.id;

  update public.properties
    set dues = greatest(0, round((dues - payment_amount)::numeric, 2)),
        cash_available = round((cash_available + payment_amount)::numeric, 2)
    where id = property_row.id;

  insert into public.payment_ledger (
    tenant_id, property_id, unit_id, paid_at, payer, payment_code,
    amount, method, match_type, status
  ) values (
    tenant_uuid, property_row.id, unit_row.id, current_date, payment_payer,
    payment_reference, payment_amount, payment_method, 'ΧΕΙΡΟΚΙΝΗΤΗ', 'Ολοκληρώθηκε'
  ) returning * into ledger_row;

  return ledger_row;
end;
$$;

revoke all on function public.post_property_payment(text,text,numeric,text,public.payment_method,text,uuid) from public;
grant execute on function public.post_property_payment(text,text,numeric,text,public.payment_method,text,uuid) to authenticated;
