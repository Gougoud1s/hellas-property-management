-- Immutable statement issue history, including supplementary/corrective issues.
-- Run after supabase_0004_atomic_payments.sql.

create table if not exists public.statement_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  period text not null,
  sequence integer not null check (sequence >= 0),
  kind text not null check (kind in ('initial', 'correction')),
  reason text,
  expense_ids jsonb not null default '[]'::jsonb,
  unit_charges jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (property_id, period, sequence),
  check (kind = 'initial' or nullif(trim(reason), '') is not null)
);

alter table public.statement_batches enable row level security;

create policy statement_batches_tenant_read
on public.statement_batches for select
using (tenant_id = public.current_tenant_id());

create policy statement_batches_company_create
on public.statement_batches for insert
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create index if not exists statement_batches_property_period_idx
on public.statement_batches (property_id, period, sequence);
