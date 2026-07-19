-- Complete read scoping for installations that already applied 0010.
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
