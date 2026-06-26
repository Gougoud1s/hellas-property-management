import { AuthRepository, AuthSession, LoginCredentials } from '../backendContracts';
import { AuthUser } from '../auth';
import { supabase } from './client';

async function buildAuthUser(profile: Record<string, unknown>): Promise<AuthUser> {
  const tenantId = profile.tenant_id as string;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single();

  let unitIds: string[] | undefined;
  let propertyIds: string[] | undefined;

  const role = profile.role as string;
  if (role === 'owner' || role === 'resident') {
    const { data: accessRows } = await supabase
      .from('user_unit_access')
      .select('units(code, properties(code))')
      .eq('user_id', profile.id as string);

    if (accessRows && accessRows.length > 0) {
      unitIds = accessRows.map((r: any) => r.units.code as string);
      propertyIds = [...new Set(accessRows.map((r: any) => r.units.properties.code as string))];
    }
  }

  return {
    id: profile.id as string,
    tenantId,
    fullName: profile.full_name as string,
    email: profile.email as string,
    role: profile.role as AuthUser['role'],
    companyName: tenant?.name ?? '',
    avatarUrl: (profile.avatar_url as string) ?? '',
    phone: profile.phone as string | undefined,
    jobTitle: profile.job_title as string | undefined,
    status: profile.status as AuthUser['status'],
    notificationEmail: profile.notification_email as boolean | undefined,
    notificationSms: profile.notification_sms as boolean | undefined,
    unitIds,
    propertyIds,
  };
}

async function profileFromAuthUid(uid: string): Promise<AuthUser> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', uid)
    .single();

  if (error || !profile) throw new Error('User profile not found');
  return buildAuthUser(profile as Record<string, unknown>);
}

export const supabaseAuthRepository: AuthRepository = {
  async getSession(): Promise<AuthSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    try {
      const user = await profileFromAuthUid(session.user.id);
      return { user, accessToken: session.access_token };
    } catch {
      return null;
    }
  },

  async signIn(credentials: LoginCredentials): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error || !data.session) throw new Error(error?.message ?? 'Login failed');
    const user = await profileFromAuthUid(data.session.user.id);
    return { user, accessToken: data.session.access_token };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
};
