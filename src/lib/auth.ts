export type UserRole = 'company_admin' | 'company_staff' | 'owner' | 'resident';
export type AppPermission =
  | 'admin:view'
  | 'admin:manage'
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
  | 'issues:view'
  | 'issues:manage'
  | 'bank:view'
  | 'bank:reconcile'
  | 'docs:view'
  | 'docs:manage'
  | 'profile:view'
  | 'profile:manage';

export type AppTab =
  | 'admin'
  | 'properties'
  | 'units'
  | 'expenses'
  | 'rules'
  | 'statements'
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
  company_admin: [
    'admin:view',
    'admin:manage',
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
    'admin:view',
    'properties:view',
    'units:view',
    'units:manage',
    'expenses:view',
    'expenses:manage',
    'rules:view',
    'statements:view',
    'issues:view',
    'issues:manage',
    'bank:view',
    'bank:reconcile',
    'docs:view',
    'docs:manage',
    'profile:view',
    'profile:manage'
  ],
  owner: ['statements:view', 'issues:view', 'docs:view', 'bank:view', 'profile:view', 'profile:manage'],
  resident: ['statements:view', 'issues:view', 'docs:view', 'profile:view', 'profile:manage']
};

const TAB_PERMISSION: Record<AppTab, AppPermission> = {
  admin: 'admin:view',
  properties: 'properties:view',
  units: 'units:view',
  expenses: 'expenses:view',
  rules: 'rules:view',
  statements: 'statements:view',
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

export function canAccessTab(user: AuthUser, tab: AppTab): boolean {
  return hasPermission(user, TAB_PERMISSION[tab]);
}

export function getDefaultTabForRole(role: UserRole): AppTab {
  if (role === 'owner' || role === 'resident') return 'statements';
  return 'properties';
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

  const { password: _password, ...authUser } = user;
  saveAuthUser(authUser);
  return { ok: true, user: authUser };
}

export const DEMO_LOGIN_HINTS = DEMO_USERS.map((user) => ({
  email: user.email,
  password: user.password,
  role: getRoleLabel(user.role)
}));

export function getDemoTenantUsers(): AuthUser[] {
  return DEMO_USERS.map(({ password: _password, ...user }) => user);
}

export function canManageUserRole(actor: AuthUser, targetRole: UserRole): boolean {
  if (actor.role === 'company_admin') return true;
  if (actor.role === 'company_staff') return targetRole === 'owner' || targetRole === 'resident';
  return false;
}

export function canEditUser(actor: AuthUser, targetUser: AuthUser): boolean {
  return actor.id === targetUser.id || canManageUserRole(actor, targetUser.role);
}
