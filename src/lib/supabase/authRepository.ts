import { AuthRepository, AuthSession, LoginCredentials } from '../backendContracts';
import { AuthUser } from '../auth';
import { supabase } from './client';
import { productConfig, userAllowedInDeployment } from '../productConfig';

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
      .eq('user_profile_id', profile.id as string);

    if (accessRows && accessRows.length > 0) {
      unitIds = accessRows.map((r: any) => r.units.code as string);
      propertyIds = [...new Set(accessRows.map((r: any) => r.units.properties.code as string))];
    }
  } else if (role === 'company_staff') {
    const { data: accessRows } = await supabase
      .from('user_property_access')
      .select('properties(code)')
      .eq('user_profile_id', profile.id as string);
    if (accessRows && accessRows.length > 0) {
      propertyIds = [...new Set(accessRows.map((row: any) => row.properties.code as string))];
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

export class MfaRequiredError extends Error {
  constructor() { super('Απαιτείται κωδικός επαλήθευσης δύο παραγόντων.'); this.name = 'MfaRequiredError'; }
}

async function verifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp.find((factor) => factor.status === 'verified')?.id ?? null;
}

export const supabaseAuthRepository: AuthRepository = {
  async getSession(): Promise<AuthSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    try {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.data?.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2') return null;
      const user = await profileFromAuthUid(session.user.id);
      if (!userAllowedInDeployment(user)) {
        await supabase.auth.signOut();
        return null;
      }
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
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw assurance.error;
    if (assurance.data.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2') throw new MfaRequiredError();
    const user = await profileFromAuthUid(data.session.user.id);
    if (!userAllowedInDeployment(user)) {
      await supabase.auth.signOut();
      throw new Error(`Ο λογαριασμός δεν ανήκει στο περιβάλλον ${productConfig.tenantName}.`);
    }
    return { user, accessToken: data.session.access_token };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async verifyMfa(code: string): Promise<AuthSession> {
    const factorId = await verifiedTotpFactorId();
    if (!factorId) throw new Error('Δεν βρέθηκε ενεργός παράγοντας MFA.');
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error || !data) throw new Error(error?.message ?? 'Ο κωδικός MFA δεν έγινε αποδεκτός.');
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Η ασφαλής συνεδρία δεν δημιουργήθηκε.');
    const user = await profileFromAuthUid(sessionData.session.user.id);
    if (!userAllowedInDeployment(user)) throw new Error('Ο λογαριασμός δεν επιτρέπεται σε αυτό το περιβάλλον.');
    return { user, accessToken: sessionData.session.access_token };
  },
};
