import type { IndividualSignupMethod } from '../types';
import { isSingleTenant, productConfig, userAllowedInDeployment } from './productConfig';

export type UserRole = 'platform_admin' | 'company_admin' | 'company_staff' | 'owner' | 'resident';
export type AppPermission =
  | 'dashboard:view'
  | 'admin:view'
  | 'admin:manage'
  | 'tenants:view'
  | 'tenants:manage'
  | 'properties:view'
  | 'properties:manage'
  | 'units:view'
  | 'units:manage'
  | 'expenses:view'
  | 'expenses:manage'
  | 'rules:view'
  | 'rules:manage'
  | 'statements:view'
  | 'statements:publish'
  | 'invoicing:view'
  | 'invoicing:manage'
  | 'assemblies:view'
  | 'assemblies:manage'
  | 'calendar:view'
  | 'calendar:manage'
  | 'issues:view'
  | 'issues:manage'
  | 'bank:view'
  | 'bank:reconcile'
  | 'docs:view'
  | 'docs:manage'
  | 'profile:view'
  | 'profile:manage';

export type AppTab =
  | 'dashboard'
  | 'admin'
  | 'tenants'
  | 'users'
  | 'subscriptions'
  | 'settings'
  | 'properties'
  | 'units'
  | 'expenses'
  | 'rules'
  | 'statements'
  | 'invoicing'
  | 'assemblies'
  | 'calendar'
  | 'issues'
  | 'bank'
  | 'docs'
  | 'profile';

export interface AuthUser {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyName: string;
  avatarUrl: string;
  phone?: string;
  jobTitle?: string;
  status?: 'active' | 'invited' | 'disabled';
  notificationEmail?: boolean;
  notificationSms?: boolean;
  propertyIds?: string[];
  unitIds?: string[];
}

export interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

const AUTH_STORAGE_KEY = 'hpm_auth_user';
const DEFAULT_TENANT_ID = 'tenant-hellas-pm';

const DEMO_USERS: Array<AuthUser & { password: string }> = [
  {
    // Seeded from installation with a default password.
    id: 'usr-platform-1',
    tenantId: 'tenant-atlas-platform',
    fullName: 'Platform Administrator',
    email: 'platform@atlaspm.gr',
    password: 'platform123',
    role: 'platform_admin',
    companyName: 'Atlas PM',
    phone: '210-0000000',
    jobTitle: 'Platform Administrator',
    status: 'active',
    notificationEmail: true,
    notificationSms: false,
    avatarUrl: 'https://ui-avatars.com/api/?background=004349&color=fff&bold=true&name=Platform+Admin'
  },
  {
    id: 'usr-admin-1',
    tenantId: 'tenant-hellas-pm',
    fullName: 'Γεώργιος Δημητρίου',
    email: 'admin@hellaspm.gr',
    password: 'admin123',
    role: 'company_admin',
    companyName: 'Hellas Property Management',
    phone: '210-9993311',
    jobTitle: 'Managing Partner',
    status: 'active',
    notificationEmail: true,
    notificationSms: false,
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD6cwUSvLhqjWyORNMs4_PrjnQ0o0tjrvQ8vWREi0GvqlMPqr1iPLmnp2-DuMNZnbplKTKlp-2m9apWPQ4QXhyFa5h3kG0fHWvu_-CVWrH22RIVnXmJnnoMCfl_nwQUdpugVP161LsUJamC4F4zOxCovNfkdEmELt7CeVmMVrS8hMwKbbY6fan34iYqjYvoZkkwbM0HXDeZRiSLRjH9iCWNnKAZvSr6HmjL70Fp2vGxLQ7rIr25MmwBPLzVrcZ8sX5iUcqId-e4nSk'
  },
  {
    id: 'usr-staff-1',
    tenantId: 'tenant-hellas-pm',
    fullName: 'Μαρία Αντωνίου',
    email: 'staff@hellaspm.gr',
    password: 'staff123',
    role: 'company_staff',
    companyName: 'Hellas Property Management',
    phone: '210-9993312',
    jobTitle: 'Operations Manager',
    status: 'active',
    notificationEmail: true,
    notificationSms: true,
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80'
  },
  {
    id: 'usr-anastassiadis-admin',
    tenantId: 'tenant-anastassiadis',
    fullName: 'Demo Διαχειριστής Αναστασιάδης',
    email: 'demo@anastassiadis.com',
    password: 'demo123',
    role: 'company_admin',
    companyName: 'Anastassiadis Group',
    phone: '+30 210 963 3920',
    jobTitle: 'Building Management Demo',
    status: 'active',
    notificationEmail: true,
    notificationSms: false,
    avatarUrl: 'https://ui-avatars.com/api/?background=1f2937&color=d4af37&bold=true&name=Anastassiadis+Group'
  },
  {
    id: 'usr-anastassiadis-staff',
    tenantId: 'tenant-anastassiadis',
    fullName: 'Ελένη Μάρκου',
    email: 'staff@anastassiadis.demo',
    password: 'staff123',
    role: 'company_staff',
    companyName: 'Anastassiadis Group',
    phone: '6900002001',
    jobTitle: 'Property Operations',
    status: 'active',
    notificationEmail: true,
    notificationSms: true,
    propertyIds: ['ANA-IL-01', 'ANA-GL-02'],
    avatarUrl: 'https://ui-avatars.com/api/?background=004349&color=fff&bold=true&name=Eleni+Markou'
  },
  {
    id: 'usr-anastassiadis-owner',
    tenantId: 'tenant-anastassiadis',
    fullName: 'Νικόλαος Αντωνίου',
    email: 'demo.owner1@example.gr',
    password: 'owner123',
    role: 'owner',
    companyName: 'Anastassiadis Group',
    phone: '6900001001',
    jobTitle: 'Ιδιοκτήτης A1',
    status: 'active',
    notificationEmail: true,
    notificationSms: false,
    propertyIds: ['ANA-IL-01'],
    unitIds: ['A1'],
    avatarUrl: 'https://ui-avatars.com/api/?background=97462f&color=fff&bold=true&name=Nikolaos+Antoniou'
  },
  {
    id: 'usr-anastassiadis-resident',
    tenantId: 'tenant-anastassiadis',
    fullName: 'Αλέξανδρος Ρήγας',
    email: 'resident@anastassiadis.demo',
    password: 'resident123',
    role: 'resident',
    companyName: 'Anastassiadis Group',
    phone: '6900002002',
    jobTitle: 'Ένοικος A2',
    status: 'active',
    notificationEmail: true,
    notificationSms: true,
    propertyIds: ['ANA-IL-01'],
    unitIds: ['A2'],
    avatarUrl: 'https://ui-avatars.com/api/?background=0d5c63&color=fff&bold=true&name=Alexandros+Rigas'
  },
  {
    id: 'usr-owner-1',
    tenantId: 'tenant-hellas-pm',
    fullName: 'Ιωάννης Παπαδόπουλος',
    email: 'owner@example.gr',
    password: 'owner123',
    role: 'owner',
    companyName: 'Hellas Property Management',
    phone: '697-4000001',
    jobTitle: 'Ιδιοκτήτης Α1',
    status: 'active',
    notificationEmail: true,
    notificationSms: false,
    propertyIds: ['ATH-0226'],
    unitIds: ['A1', 'P1'],
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&q=80'
  },
  {
    id: 'usr-resident-1',
    tenantId: 'tenant-hellas-pm',
    fullName: 'Ανδρέας Νικολάου',
    email: 'resident@example.gr',
    password: 'resident123',
    role: 'resident',
    companyName: 'Hellas Property Management',
    phone: '697-4000002',
    jobTitle: 'Ένοικος B1',
    status: 'active',
    notificationEmail: true,
    notificationSms: true,
    propertyIds: ['ATH-0226'],
    unitIds: ['B1'],
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&q=80'
  }
];

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'platform_admin':
      return 'Διαχειριστής Πλατφόρμας';
    case 'company_admin':
      return 'Διαχειριστής Εταιρείας';
    case 'company_staff':
      return 'Υπάλληλος Εταιρείας';
    case 'owner':
      return 'Ιδιοκτήτης';
    case 'resident':
      return 'Κάτοικος';
    default:
      return 'Χρήστης';
  }
}

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  platform_admin: [
    'dashboard:view',
    'admin:view',
    'admin:manage',
    'tenants:view',
    'tenants:manage',
    'properties:view',
    'properties:manage',
    'units:view',
    'units:manage',
    'expenses:view',
    'expenses:manage',
    'rules:view',
    'rules:manage',
    'statements:view',
    'statements:publish',
    'invoicing:view',
    'invoicing:manage',
    'assemblies:view',
    'assemblies:manage',
    'calendar:view',
    'calendar:manage',
    'issues:view',
    'issues:manage',
    'bank:view',
    'bank:reconcile',
    'docs:view',
    'docs:manage',
    'profile:view',
    'profile:manage'
  ],
  company_admin: [
    'dashboard:view',
    'admin:view',
    'admin:manage',
    'tenants:view',
    'tenants:manage',
    'properties:view',
    'properties:manage',
    'units:view',
    'units:manage',
    'expenses:view',
    'expenses:manage',
    'rules:view',
    'rules:manage',
    'statements:view',
    'statements:publish',
    'invoicing:view',
    'invoicing:manage',
    'assemblies:view',
    'assemblies:manage',
    'calendar:view',
    'calendar:manage',
    'issues:view',
    'issues:manage',
    'bank:view',
    'bank:reconcile',
    'docs:view',
    'docs:manage',
    'profile:view',
    'profile:manage'
  ],
  company_staff: [
    'dashboard:view',
    'admin:view',
    'tenants:view',
    'tenants:manage',
    'properties:view',
    'units:view',
    'units:manage',
    'expenses:view',
    'expenses:manage',
    'rules:view',
    'statements:view',
    'invoicing:view',
    'invoicing:manage',
    'assemblies:view',
    'assemblies:manage',
    'calendar:view',
    'calendar:manage',
    'issues:view',
    'issues:manage',
    'bank:view',
    'bank:reconcile',
    'docs:view',
    'docs:manage',
    'profile:view',
    'profile:manage'
  ],
  owner: ['dashboard:view', 'statements:view', 'assemblies:view', 'calendar:view', 'issues:view', 'docs:view', 'bank:view', 'profile:view', 'profile:manage'],
  resident: ['dashboard:view', 'statements:view', 'assemblies:view', 'calendar:view', 'issues:view', 'docs:view', 'profile:view', 'profile:manage']
};

const TAB_PERMISSION: Record<AppTab, AppPermission> = {
  dashboard: 'dashboard:view',
  admin: 'admin:view',
  tenants: 'tenants:view',
  users: 'admin:view',
  subscriptions: 'admin:manage',
  settings: 'admin:view',
  properties: 'properties:view',
  units: 'units:view',
  expenses: 'expenses:view',
  rules: 'rules:view',
  statements: 'statements:view',
  invoicing: 'invoicing:view',
  assemblies: 'assemblies:view',
  calendar: 'calendar:view',
  issues: 'issues:view',
  bank: 'bank:view',
  docs: 'docs:view',
  profile: 'profile:view'
};

export function getPermissionsForRole(role: UserRole): AppPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(user: AuthUser, permission: AppPermission): boolean {
  return getPermissionsForRole(user.role).includes(permission);
}

/**
 * The platform administrator runs the SaaS itself, so their world is the
 * platform's *customers* — the tenants (property-management companies and
 * individual managers) and the stats that describe them. All the day-to-day
 * property-operations surfaces (buildings, units, expenses, statements, bank,
 * issues, docs, PM settings, …) belong to the tenants, not to the platform
 * manager, so they are intentionally kept out of this role's navigation.
 * Profile stays available for the manager's own account.
 */
const PLATFORM_ADMIN_TABS: AppTab[] = ['tenants', 'users', 'subscriptions', 'profile'];
const PLATFORM_ONLY_TABS = new Set<AppTab>(['tenants', 'users', 'subscriptions']);

export function canAccessTab(user: AuthUser, tab: AppTab): boolean {
  if (user.role === 'platform_admin' && !PLATFORM_ADMIN_TABS.includes(tab)) {
    return false;
  }
  if (user.role !== 'platform_admin' && PLATFORM_ONLY_TABS.has(tab)) {
    return false;
  }
  return hasPermission(user, TAB_PERMISSION[tab]);
}

export function getDefaultTabForRole(role: UserRole): AppTab {
  if (role !== 'platform_admin') return 'dashboard';
  if (role === 'platform_admin') return 'tenants';
  return 'dashboard';
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  if (user.tenantId && (user.role === 'company_admin' || user.role === 'company_staff' || user.unitIds)) {
    return user;
  }

  const demoUser = DEMO_USERS.find((candidate) => candidate.email.toLowerCase() === user.email.toLowerCase());
  if (demoUser) {
    const { password: _password, ...authUser } = demoUser;
    return authUser;
  }

  return {
    ...user,
    tenantId: user.tenantId || DEFAULT_TENANT_ID,
    propertyIds: user.propertyIds || (user.role === 'owner' || user.role === 'resident' ? ['ATH-0226'] : undefined),
    unitIds: user.unitIds || (user.role === 'owner' ? ['A1', 'P1'] : user.role === 'resident' ? ['B1'] : undefined)
  };
}

export function getSavedAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? normalizeAuthUser(JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthUser): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function loginWithCredentials(email: string, password: string): LoginResult {
  const normalizedEmail = email.trim().toLowerCase();
  const user = DEMO_USERS.find(
    (candidate) => candidate.email.toLowerCase() === normalizedEmail && candidate.password === password
  );

  if (!user) {
    return {
      ok: false,
      error: 'Τα στοιχεία σύνδεσης δεν αντιστοιχούν σε ενεργό demo λογαριασμό.'
    };
  }

  if (!userAllowedInDeployment(user)) {
    return { ok: false, error: `Ο λογαριασμός δεν ανήκει στο περιβάλλον ${productConfig.tenantName}.` };
  }

  const { password: _password, ...authUser } = user;
  saveAuthUser(authUser);
  return { ok: true, user: authUser };
}

export const DEMO_LOGIN_HINTS = DEMO_USERS.filter(userAllowedInDeployment).map((user) => ({
  email: user.email,
  password: user.password,
  role: getRoleLabel(user.role)
}));

export function getDemoTenantUsers(): AuthUser[] {
  return DEMO_USERS.filter((user) => !isSingleTenant() || userAllowedInDeployment(user))
    .map(({ password: _password, ...user }) => user);
}

export function canManageUserRole(actor: AuthUser, targetRole: UserRole): boolean {
  if (actor.role === 'platform_admin') return true;
  if (actor.role === 'company_admin') return targetRole !== 'platform_admin';
  if (actor.role === 'company_staff') return targetRole === 'owner' || targetRole === 'resident';
  return false;
}

export function canEditUser(actor: AuthUser, targetUser: AuthUser): boolean {
  return actor.id === targetUser.id || canManageUserRole(actor, targetUser.role);
}

/**
 * Registers an Individual Property Manager and returns their session user.
 * Individual PMs self-subscribe (Email / Google / Facebook / Apple) and become
 * the admin of their own freshly-created tenant workspace.
 * Demo-only: no real OAuth is performed for social providers.
 */
export function registerIndividualPropertyManager(input: {
  fullName: string;
  email: string;
  method: IndividualSignupMethod;
}): AuthUser {
  const seed = `${input.email}-${input.method}`;
  const user: AuthUser = {
    id: `usr-ipm-${seed}`,
    tenantId: `tenant-ipm-${seed}`,
    fullName: input.fullName,
    email: input.email,
    role: 'company_admin',
    companyName: input.fullName,
    avatarUrl: `https://ui-avatars.com/api/?background=004349&color=fff&bold=true&name=${encodeURIComponent(input.fullName)}`,
    status: 'active',
    notificationEmail: true,
    notificationSms: false
  };
  saveAuthUser(user);
  return user;
}
