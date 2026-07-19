import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthUser, canAccessTab } from '../src/lib/auth';
import { platformCan } from '../src/lib/rbac';

const tenantAdmin: AuthUser = {
  id: 'tenant-admin',
  tenantId: 'tenant-anastassiadis',
  fullName: 'Tenant Admin',
  email: 'tenant@example.gr',
  role: 'company_admin',
  companyName: 'Tenant Company',
  avatarUrl: ''
};

const platformAdmin: AuthUser = {
  ...tenantAdmin,
  id: 'platform-admin',
  tenantId: 'tenant-atlas-platform',
  role: 'platform_admin'
};

test('tenant administrators cannot access platform customer or revenue screens', () => {
  assert.equal(canAccessTab(tenantAdmin, 'subscriptions'), false);
  assert.equal(canAccessTab(tenantAdmin, 'tenants'), false);
  assert.equal(canAccessTab(tenantAdmin, 'users'), false);
  assert.equal(platformCan(tenantAdmin, 'ReadPlatformSubscription'), false);
});

test('platform administrators can access platform administration screens', () => {
  assert.equal(canAccessTab(platformAdmin, 'subscriptions'), true);
  assert.equal(canAccessTab(platformAdmin, 'tenants'), true);
  assert.equal(canAccessTab(platformAdmin, 'users'), true);
});

test('tenant administrators retain access to their own operational screens', () => {
  assert.equal(canAccessTab(tenantAdmin, 'admin'), true);
  assert.equal(canAccessTab(tenantAdmin, 'settings'), true);
  assert.equal(canAccessTab(tenantAdmin, 'properties'), true);
  assert.equal(canAccessTab(tenantAdmin, 'statements'), true);
});
