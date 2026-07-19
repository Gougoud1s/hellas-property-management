-- Production integrity, auditability and persistent integration state.
-- Run after supabase_0007_unit_occupant_integrity.sql.

create extension if not exists pgcrypto;

alter type public.payment_method add value if not exists 'Κάρτα';

alter table public.units
  add column if not exists participation_start date,
  add column if not exists participation_end date,
  add column if not exists participation_policy text not null default 'full'
    check (participation_policy in ('full', 'prorated'));

alter table public.account_notices
  add column if not exists statement_batch_id uuid references public.statement_batches(id) on delete set null;

alter table public.expenses
  add column if not exists storage_path text,
  add column if not exists source_issue_id uuid references public.issues(id) on delete set null;
create unique index if not exists expenses_source_issue_idx on public.expenses (source_issue_id) where source_issue_id is not null;

alter table public.calendar_events
  add column if not exists source_key text;
create unique index if not exists calendar_events_tenant_source_idx
  on public.calendar_events (tenant_id, source_key);

alter table public.units drop constraint if exists units_participation_dates_check;
alter table public.units add constraint units_participation_dates_check
  check (participation_end is null or participation_start is null or participation_end >= participation_start);

alter table public.statement_batches
  add column if not exists idempotency_key text,
  add column if not exists issued_by uuid references public.user_profiles(id) on delete set null,
  add column if not exists unit_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists rule_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists expense_snapshot jsonb not null default '[]'::jsonb;

create unique index if not exists statement_batches_idempotency_idx
  on public.statement_batches (tenant_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists payment_ledger_tenant_reference_idx
  on public.payment_ledger (tenant_id, payment_code);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_profile_id uuid references public.user_profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  property_id uuid references public.properties(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  token_hash text not null unique,
  calendar_name text not null default 'Atlas PM',
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  statement_id uuid references public.statements(id) on delete set null,
  idempotency_key text not null,
  provider text not null default 'viva',
  provider_order_code text,
  amount numeric(12,2) not null check (amount > 0 and amount <= 50000),
  payer_name text not null,
  payer_email text,
  period text not null,
  currency text not null default 'EUR',
  status text not null default 'created' check (status in ('created','pending','paid','failed','cancelled','refunded')),
  paid_transaction_id text,
  created_by uuid references public.user_profiles(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key),
  unique (provider, provider_order_code),
  unique (provider, paid_transaction_id)
);

-- Upgrade the legacy payment_orders table created by the initial schema.
alter table public.payment_orders
  add column if not exists property_id uuid references public.properties(id) on delete cascade,
  add column if not exists statement_id uuid references public.statements(id) on delete set null,
  add column if not exists idempotency_key text,
  add column if not exists provider text not null default 'viva',
  add column if not exists provider_order_code text,
  add column if not exists currency text not null default 'EUR',
  add column if not exists payer_name text,
  add column if not exists payer_email text,
  add column if not exists period text,
  add column if not exists paid_transaction_id text,
  add column if not exists created_by uuid references public.user_profiles(id) on delete set null,
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.payment_orders po set
  property_id = coalesce(po.property_id, u.property_id),
  provider_order_code = coalesce(po.provider_order_code, po.viva_order_code),
  idempotency_key = coalesce(po.idempotency_key, 'legacy:' || po.id::text),
  payer_name = coalesce(po.payer_name, u.owner_name, 'Άγνωστος πληρωτής'),
  period = coalesce(po.period, p.period, 'Άγνωστη περίοδος')
from public.units u join public.properties p on p.id = u.property_id
where u.id = po.unit_id;

alter table public.payment_orders
  alter column property_id set not null,
  alter column idempotency_key set not null,
  alter column payer_name set not null,
  alter column period set not null;

create unique index if not exists payment_orders_idempotency_idx on public.payment_orders (tenant_id, idempotency_key);
create unique index if not exists payment_orders_provider_order_idx on public.payment_orders (provider, provider_order_code) where provider_order_code is not null;
create unique index if not exists payment_orders_provider_transaction_idx on public.payment_orders (provider, paid_transaction_id) where paid_transaction_id is not null;

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload_hash text not null,
  status text not null default 'received' check (status in ('received','verified','processed','ignored','failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table if not exists public.integration_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  channel text not null,
  recipient text not null,
  template text not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','failed','bounced','cancelled')),
  attempt_count integer not null default 0,
  last_error text,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

alter table public.audit_events enable row level security;
alter table public.calendar_feeds enable row level security;
alter table public.payment_orders enable row level security;
alter table public.webhook_events enable row level security;
alter table public.integration_deliveries enable row level security;

create or replace function public.can_access_property(target_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_company_user() or exists (
    select 1 from public.units u join public.user_unit_access a on a.unit_id = u.id
    where u.property_id = target_property_id and a.user_profile_id = public.current_profile_id()
  );
$$;

create policy audit_events_company_read on public.audit_events for select
  using (tenant_id = public.current_tenant_id() and public.is_company_user());
create policy audit_events_company_insert on public.audit_events for insert
  with check (tenant_id = public.current_tenant_id() and actor_profile_id = public.current_profile_id());

create policy calendar_feeds_owner on public.calendar_feeds for all
  using (tenant_id = public.current_tenant_id() and owner_profile_id = public.current_profile_id())
  with check (tenant_id = public.current_tenant_id() and owner_profile_id = public.current_profile_id());

drop policy if exists payment_orders_scoped on public.payment_orders;
drop policy if exists payment_orders_company_read on public.payment_orders;
drop policy if exists payment_orders_user_create on public.payment_orders;
create policy payment_orders_company_read on public.payment_orders for select
  using (tenant_id = public.current_tenant_id() and (public.is_company_user() or public.can_access_unit(unit_id)));
create policy payment_orders_user_create on public.payment_orders for insert
  with check (tenant_id = public.current_tenant_id() and public.can_access_unit(unit_id));

create policy integration_deliveries_company on public.integration_deliveries for select
  using (tenant_id = public.current_tenant_id() and public.is_company_user());

-- Service-role-only tables: no client policies are intentionally added for webhook_events.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tenant-documents', 'tenant-documents', false, 15728640, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('tenant-branding', 'tenant-branding', false, 2097152, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object paths must begin with the authenticated tenant UUID.
create policy tenant_storage_read on storage.objects for select to authenticated
using (
  bucket_id in ('tenant-documents','tenant-branding')
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
);
create policy tenant_storage_company_insert on storage.objects for insert to authenticated
with check (
  bucket_id in ('tenant-documents','tenant-branding')
  and public.is_company_user()
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
);
create policy tenant_storage_company_update on storage.objects for update to authenticated
using (public.is_company_user() and (storage.foldername(name))[1] = public.current_tenant_id()::text)
with check (public.is_company_user() and (storage.foldername(name))[1] = public.current_tenant_id()::text);
create policy tenant_storage_company_delete on storage.objects for delete to authenticated
using (public.is_company_user() and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create index if not exists audit_events_tenant_created_idx on public.audit_events (tenant_id, created_at desc);
create index if not exists payment_orders_tenant_status_idx on public.payment_orders (tenant_id, status);
create index if not exists integration_deliveries_retry_idx on public.integration_deliveries (status, next_attempt_at);

drop policy if exists expenses_select_scoped on public.expenses;
create policy expenses_select_scoped on public.expenses for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_company_user() or (status = 'Verified' and public.can_access_property(property_id)))
);
drop policy if exists rules_select_same_tenant on public.distribution_rules;
create policy rules_select_scoped on public.distribution_rules for select using (
  tenant_id = public.current_tenant_id() and public.can_access_property(property_id)
);
drop policy if exists issues_select_scoped on public.issues;
create policy issues_select_scoped on public.issues for select using (
  tenant_id = public.current_tenant_id() and public.can_access_property(property_id)
  and (public.is_company_user() or unit_id is null or public.can_access_unit(unit_id))
);
drop policy if exists documents_select_visible on public.documents;
create policy documents_select_visible on public.documents for select using (
  tenant_id = public.current_tenant_id() and public.can_access_property(property_id)
  and (public.is_company_user() or visibility = 'Όλοι' or (public.current_role() = 'owner' and visibility = 'Ιδιοκτήτες'))
);
drop policy if exists calendar_events_tenant_read on public.calendar_events;
create policy calendar_events_scoped_read on public.calendar_events for select using (
  tenant_id = public.current_tenant_id() and (property_id is null or public.can_access_property(property_id))
);

create or replace function public.settle_provider_payment(
  target_order_code text,
  target_transaction_id text,
  confirmed_amount numeric
)
returns public.payment_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_order public.payment_orders%rowtype;
  ledger_row public.payment_ledger%rowtype;
begin
  select * into payment_order from public.payment_orders
    where provider = 'viva' and provider_order_code = target_order_code
    for update;
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

  update public.units set balance = round((balance - confirmed_amount)::numeric, 2)
    where id = payment_order.unit_id;
  update public.properties
    set dues = greatest(0, round((dues - confirmed_amount)::numeric, 2)),
        cash_available = round((cash_available + confirmed_amount)::numeric, 2)
    where id = payment_order.property_id;

  insert into public.payment_ledger (
    tenant_id, property_id, unit_id, paid_at, payer, payment_code,
    amount, method, match_type, status
  ) values (
    payment_order.tenant_id, payment_order.property_id, payment_order.unit_id,
    current_date, payment_order.payer_name, target_transaction_id,
    confirmed_amount, 'Κάρτα', 'ΑΥΤΟΜΑΤΗ', 'Ολοκληρώθηκε'
  ) returning * into ledger_row;

  update public.payment_orders set status = 'paid', paid_transaction_id = target_transaction_id,
    paid_at = now(), updated_at = now() where id = payment_order.id;
  return ledger_row;
end;
$$;

revoke all on function public.settle_provider_payment(text,text,numeric) from public, anon, authenticated;
grant execute on function public.settle_provider_payment(text,text,numeric) to service_role;

create or replace function public.prevent_issued_financial_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Issued financial history is immutable; create a corrective batch instead';
end;
$$;

drop trigger if exists statement_batches_immutable on public.statement_batches;
create trigger statement_batches_immutable before update or delete on public.statement_batches
for each row execute function public.prevent_issued_financial_mutation();

create or replace function public.prevent_published_statement_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'published' then
    raise exception 'Published statements are immutable; create a corrective batch instead';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists statements_published_immutable on public.statements;
create trigger statements_published_immutable before update or delete on public.statements
for each row execute function public.prevent_published_statement_mutation();

create or replace function public.prevent_published_statement_line_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.statements where id = old.statement_id and status = 'published') then
    raise exception 'Published statement lines are immutable';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists statement_lines_published_immutable on public.statement_lines;
create trigger statement_lines_published_immutable before update or delete on public.statement_lines
for each row execute function public.prevent_published_statement_line_mutation();

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
