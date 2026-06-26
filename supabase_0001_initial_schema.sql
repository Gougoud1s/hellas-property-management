-- Hellas Property Management - initial multi-tenant SaaS schema
-- Target: Supabase Postgres

create extension if not exists pgcrypto;

create type public.user_role as enum ('company_admin', 'company_staff', 'owner', 'resident');
create type public.property_status as enum ('Draft', 'Published');
create type public.unit_resident_type as enum ('Ιδιοκατοίκηση', 'Ενοικιαστής', 'Κενό');
create type public.unit_status as enum ('Ενεργό', 'Κενό');
create type public.expense_status as enum ('Verified', 'Draft');
create type public.distribution_method as enum ('Χιλιοστά', 'Ισομερής Κατανομή', 'Βάσει Εμβαδού', 'Βάσει Ατόμων');
create type public.issue_severity as enum ('High', 'Medium', 'Low', 'Urgent');
create type public.issue_status as enum ('New', 'Under Inspection', 'Assigned', 'In Progress', 'Resolved');
create type public.payment_method as enum ('Τράπεζα', 'Μετρητά');
create type public.payment_match_type as enum ('ΑΥΤΟΜΑΤΗ', 'ΧΕΙΡΟΚΙΝΗΤΗ', 'ΕΚΚΡΕΜΕΙ');
create type public.payment_status as enum ('Ολοκληρώθηκε', 'Υπό έγκριση', 'Προτεινόμενο Match');
create type public.document_type as enum ('Σύμβαση', 'Παραστατικό', 'Πρακτικά', 'Τεχνικό');
create type public.document_visibility as enum ('Μόνο Εταιρεία', 'Ιδιοκτήτες', 'Όλοι');
create type public.statement_status as enum ('draft', 'published', 'void');
create type public.charge_responsibility as enum ('owner', 'resident_or_tenant');
create type public.user_status as enum ('active', 'invited', 'disabled');
create type public.tenant_request_status as enum ('pending', 'approved', 'rejected');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tax_id text,
  support_email text,
  support_phone text,
  created_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null,
  avatar_url text,
  phone text,
  job_title text,
  status public.user_status not null default 'active',
  notification_email boolean not null default true,
  notification_sms boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table public.tenant_registration_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  city text,
  properties_estimate integer not null default 1,
  status public.tenant_request_status not null default 'pending',
  approved_by uuid references public.user_profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null,
  invited_by uuid references public.user_profiles(id) on delete set null,
  accepted_by uuid references public.user_profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  address text not null,
  period text not null,
  status public.property_status not null default 'Draft',
  dues numeric(12, 2) not null default 0,
  image_url text,
  occupancy numeric(5, 2) not null default 100,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  code text not null,
  floor text not null,
  type text not null,
  size numeric(10, 2) not null default 0,
  share numeric(10, 2) not null default 0,
  coefficient numeric(10, 2) not null default 1,
  owner_name text not null,
  owner_phone text,
  owner_email text,
  resident_name text,
  resident_type public.unit_resident_type not null default 'Κενό',
  status public.unit_status not null default 'Ενεργό',
  balance numeric(12, 2) not null default 0,
  prev_balance numeric(12, 2) not null default 0,
  deposit numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (property_id, code)
);

create table public.user_unit_access (
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_profile_id, unit_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  expense_date date not null,
  supplier text not null,
  category text not null,
  amount numeric(12, 2) not null,
  file_name text,
  status public.expense_status not null default 'Draft',
  created_at timestamptz not null default now()
);

create table public.distribution_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  category text not null,
  method public.distribution_method not null,
  sample_amount numeric(12, 2) not null default 0,
  description text not null,
  created_at timestamptz not null default now(),
  unique (property_id, category)
);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  period text not null,
  previous_balance numeric(12, 2) not null default 0,
  current_charges numeric(12, 2) not null default 0,
  total_due numeric(12, 2) not null default 0,
  status public.statement_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (unit_id, period)
);

create table public.statement_lines (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.statements(id) on delete cascade,
  category text not null,
  building_total numeric(12, 2) not null,
  unit_amount numeric(12, 2) not null,
  responsible_party public.charge_responsibility not null default 'resident_or_tenant',
  created_at timestamptz not null default now()
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  severity public.issue_severity not null,
  status public.issue_status not null default 'New',
  reported_at text not null,
  estimate numeric(12, 2) not null default 0,
  technician text,
  technician_img text,
  progress integer,
  invoice_num text,
  created_at timestamptz not null default now()
);

create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  transaction_date date not null,
  amount numeric(12, 2) not null,
  bank text not null,
  reference text not null,
  description text not null,
  suggested_unit_id uuid references public.units(id) on delete set null,
  suggested_owner text,
  reconciled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payment_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  paid_at date not null,
  payer text not null,
  payment_code text not null,
  amount numeric(12, 2) not null,
  method public.payment_method not null,
  match_type public.payment_match_type not null,
  status public.payment_status not null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  document_date date not null,
  type public.document_type not null,
  visibility public.document_visibility not null,
  size text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create index properties_tenant_idx on public.properties (tenant_id);
create index units_tenant_property_idx on public.units (tenant_id, property_id);
create index expenses_tenant_property_idx on public.expenses (tenant_id, property_id);
create index issues_tenant_property_unit_idx on public.issues (tenant_id, property_id, unit_id);
create index documents_tenant_property_idx on public.documents (tenant_id, property_id);
create index payment_ledger_tenant_property_unit_idx on public.payment_ledger (tenant_id, property_id, unit_id);
create index bank_transactions_tenant_property_idx on public.bank_transactions (tenant_id, property_id);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.user_profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.user_profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_company_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('company_admin', 'company_staff');
$$;

create or replace function public.can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_company_user()
    or exists (
      select 1
      from public.user_unit_access uua
      where uua.user_profile_id = public.current_profile_id()
        and uua.unit_id = target_unit_id
    );
$$;

alter table public.tenants enable row level security;
alter table public.user_profiles enable row level security;
alter table public.tenant_registration_requests enable row level security;
alter table public.user_invitations enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.user_unit_access enable row level security;
alter table public.expenses enable row level security;
alter table public.distribution_rules enable row level security;
alter table public.statements enable row level security;
alter table public.statement_lines enable row level security;
alter table public.issues enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.payment_ledger enable row level security;
alter table public.documents enable row level security;

create policy tenants_select_same_tenant on public.tenants
for select using (id = public.current_tenant_id());

create policy profiles_select_same_tenant on public.user_profiles
for select using (tenant_id = public.current_tenant_id());

create policy profiles_admin_manage on public.user_profiles
for all
using (tenant_id = public.current_tenant_id() and public.current_role() = 'company_admin')
with check (tenant_id = public.current_tenant_id() and public.current_role() = 'company_admin');

create policy profiles_self_update on public.user_profiles
for update
using (id = public.current_profile_id())
with check (
  id = public.current_profile_id()
  and tenant_id = public.current_tenant_id()
);

create policy tenant_requests_company_admin_read on public.tenant_registration_requests
for select using (public.current_role() = 'company_admin');

create policy tenant_requests_company_admin_update on public.tenant_registration_requests
for update
using (public.current_role() = 'company_admin')
with check (public.current_role() = 'company_admin');

create policy tenant_requests_public_insert on public.tenant_registration_requests
for insert with check (status = 'pending');

create policy invitations_company_read on public.user_invitations
for select using (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy invitations_company_manage on public.user_invitations
for all
using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_role() = 'company_admin'
    or (public.current_role() = 'company_staff' and role in ('owner', 'resident'))
  )
)
with check (
  tenant_id = public.current_tenant_id()
  and (
    public.current_role() = 'company_admin'
    or (public.current_role() = 'company_staff' and role in ('owner', 'resident'))
  )
);

create policy properties_select_scoped on public.properties
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_company_user()
    or exists (
      select 1
      from public.units u
      join public.user_unit_access uua on uua.unit_id = u.id
      where u.property_id = properties.id
        and uua.user_profile_id = public.current_profile_id()
    )
  )
);

create policy properties_company_manage on public.properties
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy units_select_scoped on public.units
for select using (tenant_id = public.current_tenant_id() and public.can_access_unit(id));

create policy units_company_manage on public.units
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy unit_access_select_scoped on public.user_unit_access
for select using (
  user_profile_id = public.current_profile_id()
  or exists (
    select 1 from public.user_profiles up
    where up.id = user_unit_access.user_profile_id
      and up.tenant_id = public.current_tenant_id()
      and public.is_company_user()
  )
);

create policy unit_access_company_manage on public.user_unit_access
for all using (public.is_company_user())
with check (public.is_company_user());

create policy expenses_select_scoped on public.expenses
for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_company_user() or status = 'Verified')
);

create policy expenses_company_manage on public.expenses
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy rules_select_same_tenant on public.distribution_rules
for select using (tenant_id = public.current_tenant_id());

create policy rules_admin_manage on public.distribution_rules
for all
using (tenant_id = public.current_tenant_id() and public.current_role() = 'company_admin')
with check (tenant_id = public.current_tenant_id() and public.current_role() = 'company_admin');

create policy statements_select_scoped on public.statements
for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_company_user() or public.can_access_unit(unit_id))
);

create policy statements_company_manage on public.statements
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy statement_lines_select_scoped on public.statement_lines
for select using (
  exists (
    select 1 from public.statements s
    where s.id = statement_lines.statement_id
      and s.tenant_id = public.current_tenant_id()
      and (public.is_company_user() or public.can_access_unit(s.unit_id))
  )
);

create policy statement_lines_company_manage on public.statement_lines
for all
using (
  exists (
    select 1 from public.statements s
    where s.id = statement_lines.statement_id
      and s.tenant_id = public.current_tenant_id()
      and public.is_company_user()
  )
)
with check (
  exists (
    select 1 from public.statements s
    where s.id = statement_lines.statement_id
      and s.tenant_id = public.current_tenant_id()
      and public.is_company_user()
  )
);

create policy issues_select_scoped on public.issues
for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_company_user() or unit_id is null or public.can_access_unit(unit_id))
);

create policy issues_company_manage on public.issues
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy bank_transactions_company_manage on public.bank_transactions
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy payment_ledger_select_scoped on public.payment_ledger
for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_company_user() or (unit_id is not null and public.can_access_unit(unit_id)))
);

create policy payment_ledger_company_manage on public.payment_ledger
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());

create policy documents_select_visible on public.documents
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_company_user()
    or visibility = 'Όλοι'
    or (public.current_role() = 'owner' and visibility = 'Ιδιοκτήτες')
  )
);

create policy documents_company_manage on public.documents
for all
using (tenant_id = public.current_tenant_id() and public.is_company_user())
with check (tenant_id = public.current_tenant_id() and public.is_company_user());
