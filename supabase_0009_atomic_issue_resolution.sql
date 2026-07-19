-- Apply after 0008 on installations that already ran the production hardening migration.
alter table public.expenses
  add column if not exists source_issue_id uuid references public.issues(id) on delete set null;
create unique index if not exists expenses_source_issue_idx on public.expenses (source_issue_id) where source_issue_id is not null;

create or replace function public.resolve_issue_with_expense(target_issue_id uuid)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare issue_row public.issues%rowtype; expense_row public.expenses%rowtype;
begin
  if not public.is_company_user() then raise exception 'Insufficient permissions'; end if;
  select * into issue_row from public.issues where id = target_issue_id and tenant_id = public.current_tenant_id() for update;
  if not found then raise exception 'Issue not found'; end if;
  update public.issues set status = 'Resolved', progress = 100 where id = issue_row.id returning * into issue_row;
  if issue_row.estimate > 0 then
    insert into public.expenses (tenant_id, property_id, expense_date, supplier, category, amount, file_name, status, source_issue_id)
    values (issue_row.tenant_id, issue_row.property_id, current_date, coalesce(issue_row.technician,'Τεχνικός συνεργάτης'),
      'Συντήρηση / Βλάβη', issue_row.estimate, 'issue:' || issue_row.id::text, 'Draft', issue_row.id)
    on conflict (source_issue_id) where source_issue_id is not null do update set source_issue_id = excluded.source_issue_id
    returning * into expense_row;
  end if;
  return jsonb_build_object('issue',to_jsonb(issue_row),'expense',case when expense_row.id is null then null else to_jsonb(expense_row) end);
end;
$$;
revoke all on function public.resolve_issue_with_expense(uuid) from public;
grant execute on function public.resolve_issue_with_expense(uuid) to authenticated;
