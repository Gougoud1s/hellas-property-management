-- MFA enforcement for company administrators and prevention of self role escalation.

create or replace function public.has_admin_aal()
returns boolean language sql stable set search_path = public as $$
  select public.current_role() <> 'company_admin' or coalesce(auth.jwt()->>'aal','aal1') = 'aal2';
$$;

create or replace function public.is_company_user()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'company_staff'
    or (public.current_role() = 'company_admin' and public.has_admin_aal());
$$;

create or replace function public.can_access_property(target_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case public.current_role()
    when 'company_admin' then public.has_admin_aal()
    when 'company_staff' then
      not exists (select 1 from public.user_property_access where user_profile_id = public.current_profile_id())
      or exists (select 1 from public.user_property_access where user_profile_id = public.current_profile_id() and property_id = target_property_id)
    else exists (select 1 from public.units u join public.user_unit_access a on a.unit_id=u.id
      where u.property_id=target_property_id and a.user_profile_id=public.current_profile_id())
  end;
$$;

create or replace function public.can_access_unit(target_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case public.current_role()
    when 'company_admin' then public.has_admin_aal()
    when 'company_staff' then exists (select 1 from public.units u where u.id=target_unit_id and public.can_access_property(u.property_id))
    else exists (select 1 from public.user_unit_access a where a.user_profile_id=public.current_profile_id() and a.unit_id=target_unit_id)
  end;
$$;

-- Direct profile updates are restricted to non-privileged personal columns.
revoke update on public.user_profiles from authenticated;
grant update (full_name, avatar_url, phone, job_title, notification_email, notification_sms) on public.user_profiles to authenticated;

create or replace function public.admin_update_user(
  target_profile_id uuid, target_full_name text, target_role public.user_role,
  target_phone text, target_job_title text, target_status public.user_status,
  target_notification_email boolean, target_notification_sms boolean
)
returns public.user_profiles language plpgsql security definer set search_path = public as $$
declare result public.user_profiles%rowtype;
begin
  if public.current_role() <> 'company_admin' or not public.has_admin_aal() then raise exception 'Administrator MFA required'; end if;
  update public.user_profiles set full_name=target_full_name, role=target_role, phone=target_phone,
    job_title=target_job_title, status=target_status, notification_email=target_notification_email,
    notification_sms=target_notification_sms
  where id=target_profile_id and tenant_id=public.current_tenant_id() returning * into result;
  if not found then raise exception 'User not found'; end if;
  return result;
end;
$$;
revoke all on function public.admin_update_user(uuid,text,public.user_role,text,text,public.user_status,boolean,boolean) from public;
grant execute on function public.admin_update_user(uuid,text,public.user_role,text,text,public.user_status,boolean,boolean) to authenticated;

drop policy if exists profiles_admin_manage on public.user_profiles;
create policy profiles_admin_manage on public.user_profiles for all
using (tenant_id=public.current_tenant_id() and public.current_role()='company_admin' and public.has_admin_aal())
with check (tenant_id=public.current_tenant_id() and public.current_role()='company_admin' and public.has_admin_aal());

drop policy if exists tenants_admin_update_own on public.tenants;
create policy tenants_admin_update_own on public.tenants for update
using (id=public.current_tenant_id() and public.current_role()='company_admin' and public.has_admin_aal())
with check (id=public.current_tenant_id() and public.current_role()='company_admin' and public.has_admin_aal());

drop policy if exists rules_admin_manage on public.distribution_rules;
create policy rules_admin_manage on public.distribution_rules for all
using (tenant_id=public.current_tenant_id() and public.current_role()='company_admin' and public.has_admin_aal() and public.can_access_property(property_id))
with check (tenant_id=public.current_tenant_id() and public.current_role()='company_admin' and public.has_admin_aal() and public.can_access_property(property_id));

drop policy if exists user_property_access_admin_manage on public.user_property_access;
create policy user_property_access_admin_manage on public.user_property_access for all
using (public.current_role()='company_admin' and public.has_admin_aal() and exists (select 1 from public.properties p where p.id=property_id and p.tenant_id=public.current_tenant_id()))
with check (public.current_role()='company_admin' and public.has_admin_aal() and exists (select 1 from public.properties p where p.id=property_id and p.tenant_id=public.current_tenant_id()));

