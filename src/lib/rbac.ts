import { AuthUser, UserRole } from './auth';

/**
 * Platform RBAC — a coarse Read/Manage permission model layered over the
 * app's account types, used to gate the platform-administration surfaces
 * (subscriptions, PM settings, properties data, users).
 *
 * "Manage" implies the full CRUD set (Create, Read, Update, Delete) and always
 * includes the matching "Read".
 */
export type PlatformPermission =
  | 'ReadPlatformSubscription'
  | 'ManagePlatformSubscription'
  | 'ReadPMSettings'
  | 'ManagePMSettings'
  | 'ReadPropertiesData'
  | 'ManagePropertiesData'
  | 'ReadUsers'
  | 'ManageUsers';

/**
 * Roles summarise what a user can do.
 *  - platform_administrator — Platform Admins; can manage all data.
 *  - properties_administrator — any Individual Property Manager (IPM) or PMC
 *    Admin; manages only its own organisation and property operations.
 *  - pmc_user — users created by PMC Admins; handle the company's properties
 *    but cannot read or manage the platform subscription.
 *  - portal_user — owners/residents; no platform-administration access.
 */
export type PlatformRole = 'platform_administrator' | 'properties_administrator' | 'pmc_user' | 'portal_user';

const ALL_PERMISSIONS: PlatformPermission[] = [
  'ReadPlatformSubscription',
  'ManagePlatformSubscription',
  'ReadPMSettings',
  'ManagePMSettings',
  'ReadPropertiesData',
  'ManagePropertiesData',
  'ReadUsers',
  'ManageUsers'
];

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  // Manages all the data.
  platform_administrator: ALL_PERMISSIONS,
  // Manages its own settings, properties and users; platform billing is private.
  properties_administrator: [
    'ReadPMSettings',
    'ManagePMSettings',
    'ReadPropertiesData',
    'ManagePropertiesData',
    'ReadUsers',
    'ManageUsers'
  ],
  // Handles company properties; no subscription access; cannot manage users.
  pmc_user: ['ReadPMSettings', 'ReadPropertiesData', 'ManagePropertiesData', 'ReadUsers'],
  portal_user: []
};

const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  platform_administrator: 'Platform Administrator',
  properties_administrator: 'Properties Administrator',
  pmc_user: 'PMC User',
  portal_user: 'Portal User'
};

/** Maps an account's {@link UserRole} to its platform RBAC role. */
export function getPlatformRole(user: AuthUser): PlatformRole {
  switch (user.role) {
    case 'platform_admin':
      return 'platform_administrator';
    case 'company_admin':
      // Both PMC Admin and Individual Property Manager onboard as company_admin.
      return 'properties_administrator';
    case 'company_staff':
      return 'pmc_user';
    default:
      return 'portal_user';
  }
}

export function getPlatformRoleLabel(user: AuthUser): string {
  return PLATFORM_ROLE_LABEL[getPlatformRole(user)];
}

export function getPlatformPermissions(user: AuthUser): PlatformPermission[] {
  return PLATFORM_ROLE_PERMISSIONS[getPlatformRole(user)];
}

/** Whether the user holds a given platform permission. */
export function platformCan(user: AuthUser, permission: PlatformPermission): boolean {
  return getPlatformPermissions(user).includes(permission);
}
