-- Tenant-owned workspace branding and public company profile.
-- Run after supabase_0001_initial_schema.sql.

alter table public.tenants
  add column if not exists logo_url text,
  add column if not exists website_url text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists profession text;

-- Tenant admins may maintain their own organisation profile. The existing
-- tenant select policy remains unchanged.
create policy tenants_admin_update_own
on public.tenants for update
using (
  id = public.current_tenant_id()
  and public.current_role() = 'company_admin'
)
with check (
  id = public.current_tenant_id()
  and public.current_role() = 'company_admin'
);
