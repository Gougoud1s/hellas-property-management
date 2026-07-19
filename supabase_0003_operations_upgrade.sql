-- Operational calendar, account notices, property treasury balances and
-- multi-property collaborator assignments.
-- Run after supabase_0002_tenant_branding.sql.

alter table public.properties
  add column if not exists reserve_fund numeric(12, 2) not null default 0,
  add column if not exists cash_available numeric(12, 2) not null default 0;

create table if not exists public.user_property_access (
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_profile_id, property_id)
);

create table if not exists public.account_notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  period text not null,
  recipient text not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  channel text not null check (channel in ('email', 'sms', 'print')),
  status text not null check (status in ('draft', 'sent')) default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (unit_id, period)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_type text not null check (event_type in ('payment', 'maintenance', 'assembly', 'deadline', 'other')),
  notes text,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.user_property_access enable row level security;
alter table public.account_notices enable row level security;
alter table public.calendar_events enable row level security;

create policy user_property_access_tenant_admin
on public.user_property_access for all
using (
  public.is_company_user() and exists (
    select 1 from public.properties p
    where p.id = property_id and p.tenant_id = public.current_tenant_id()
  )
)
with check (
  public.is_company_user() and exists (
    select 1 from public.properties p
    where p.id = property_id and p.tenant_id = public.current_tenant_id()
  )
);

create policy account_notices_company
on public.account_notices for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy calendar_events_tenant_read
on public.calendar_events for select
using (tenant_id = public.current_tenant_id());

create policy calendar_events_company_manage
on public.calendar_events for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create index if not exists calendar_events_tenant_date_idx on public.calendar_events (tenant_id, event_date);
create index if not exists account_notices_property_period_idx on public.account_notices (property_id, period);
