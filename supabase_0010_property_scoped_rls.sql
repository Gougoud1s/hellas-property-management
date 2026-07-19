-- Database-authoritative property scope for staff, owners and residents.
-- Run after 0009.

create or replace function public.can_access_property(target_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case public.current_role()
    when 'company_admin' then true
    when 'company_staff' then
      not exists (select 1 from public.user_property_access where user_profile_id = public.current_profile_id())
      or exists (select 1 from public.user_property_access where user_profile_id = public.current_profile_id() and property_id = target_property_id)
    else exists (
      select 1 from public.units u join public.user_unit_access a on a.unit_id = u.id
      where u.property_id = target_property_id and a.user_profile_id = public.current_profile_id()
    )
  end;
$$;

create or replace function public.can_access_unit(target_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case public.current_role()
    when 'company_admin' then true
    when 'company_staff' then exists (
      select 1 from public.units u where u.id = target_unit_id and public.can_access_property(u.property_id)
    )
    else exists (
      select 1 from public.user_unit_access a
      where a.user_profile_id = public.current_profile_id() and a.unit_id = target_unit_id
    )
  end;
$$;

drop policy if exists properties_select_scoped on public.properties;
create policy properties_select_scoped on public.properties for select using (
  tenant_id = public.current_tenant_id() and public.can_access_property(id)
);

drop policy if exists statements_select_scoped on public.statements;
create policy statements_select_scoped on public.statements for select using (
  tenant_id = public.current_tenant_id() and
  (public.is_company_user() and public.can_access_property(property_id) or public.can_access_unit(unit_id))
);

drop policy if exists statement_lines_select_scoped on public.statement_lines;
create policy statement_lines_select_scoped on public.statement_lines for select using (
  exists (select 1 from public.statements s where s.id = statement_id and s.tenant_id = public.current_tenant_id()
    and (public.is_company_user() and public.can_access_property(s.property_id) or public.can_access_unit(s.unit_id)))
);

drop policy if exists payment_ledger_select_scoped on public.payment_ledger;
create policy payment_ledger_select_scoped on public.payment_ledger for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_company_user() and public.can_access_property(property_id) or (unit_id is not null and public.can_access_unit(unit_id)))
);

drop policy if exists properties_company_manage on public.properties;
create policy properties_company_manage on public.properties for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(id));

drop policy if exists units_company_manage on public.units;
create policy units_company_manage on public.units for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists expenses_company_manage on public.expenses;
create policy expenses_company_manage on public.expenses for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists issues_company_manage on public.issues;
create policy issues_company_manage on public.issues for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists bank_transactions_company_manage on public.bank_transactions;
create policy bank_transactions_company_manage on public.bank_transactions for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists payment_ledger_company_manage on public.payment_ledger;
create policy payment_ledger_company_manage on public.payment_ledger for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists documents_company_manage on public.documents;
create policy documents_company_manage on public.documents for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists calendar_events_company_manage on public.calendar_events;
create policy calendar_events_company_manage on public.calendar_events for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and (property_id is null or public.can_access_property(property_id)))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and (property_id is null or public.can_access_property(property_id)));

drop policy if exists account_notices_company on public.account_notices;
create policy account_notices_scoped_read on public.account_notices for select
using (tenant_id = public.current_tenant_id() and (public.is_company_user() and public.can_access_property(property_id) or public.can_access_unit(unit_id)));
create policy account_notices_company_manage on public.account_notices for all
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id))
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists statement_batches_tenant_read on public.statement_batches;
create policy statement_batches_company_read on public.statement_batches for select
using (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists statement_batches_company_create on public.statement_batches;
create policy statement_batches_company_create on public.statement_batches for insert
with check (tenant_id = public.current_tenant_id() and public.is_company_user() and public.can_access_property(property_id));

drop policy if exists user_property_access_tenant_admin on public.user_property_access;
create policy user_property_access_admin_manage on public.user_property_access for all
using (public.current_role() = 'company_admin' and exists (select 1 from public.properties p where p.id = property_id and p.tenant_id = public.current_tenant_id()))
with check (public.current_role() = 'company_admin' and exists (select 1 from public.properties p where p.id = property_id and p.tenant_id = public.current_tenant_id()));
