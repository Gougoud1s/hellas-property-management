import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthUser, getDemoTenantUsers } from '../src/lib/auth';
import { getVisibleProperties, getVisibleUnits } from '../src/lib/tenantScope';
import { INITIAL_PROPERTIES, INITIAL_UNITS, Property } from '../src/types';

const properties: Property[] = ['A', 'B', 'C'].map((id) => ({
  id, tenantId: 'tenant-1', name: id, address: id, unitsCount: 1,
  period: 'Ιούλιος 2026', status: 'Published', dues: 0, issuesCount: 0,
  imageUrl: '', occupancy: 100
}));

const baseUser: AuthUser = {
  id: 'user-1', tenantId: 'tenant-1', fullName: 'User', email: 'u@example.gr',
  companyName: 'Company', avatarUrl: '', role: 'company_staff'
};

test('a collaborator can be assigned to more than one property', () => {
  const visible = getVisibleProperties({ ...baseUser, propertyIds: ['A', 'C'] }, properties);
  assert.deepEqual(visible.map((property) => property.id), ['A', 'C']);
});

test('an unassigned collaborator retains tenant-wide access for backwards compatibility', () => {
  const visible = getVisibleProperties(baseUser, properties);
  assert.equal(visible.length, 3);
});

test('a collaborator never sees another tenant property', () => {
  const visible = getVisibleProperties(
    { ...baseUser, propertyIds: ['A', 'FOREIGN'] },
    [...properties, { ...properties[0], id: 'FOREIGN', tenantId: 'tenant-2' }]
  );
  assert.deepEqual(visible.map((property) => property.id), ['A']);
});

test('Anastassiadis staff demo is dynamically scoped to two assigned buildings', () => {
  const staff = getDemoTenantUsers().find((user) => user.email === 'staff@anastassiadis.demo');
  assert.ok(staff);
  assert.deepEqual(
    getVisibleProperties(staff, INITIAL_PROPERTIES).map((property) => property.id),
    ['ANA-IL-01', 'ANA-GL-02']
  );
});

test('Anastassiadis owner demo can only access unit A1', () => {
  const owner = getDemoTenantUsers().find((user) => user.email === 'demo.owner1@example.gr');
  const property = INITIAL_PROPERTIES.find((item) => item.id === 'ANA-IL-01');
  assert.ok(owner && property);
  assert.deepEqual(getVisibleUnits(owner, INITIAL_UNITS, property).map((unit) => unit.id), ['A1']);
});

test('Anastassiadis resident demo can only access unit A2', () => {
  const resident = getDemoTenantUsers().find((user) => user.email === 'resident@anastassiadis.demo');
  const property = INITIAL_PROPERTIES.find((item) => item.id === 'ANA-IL-01');
  assert.ok(resident && property);
  assert.deepEqual(getVisibleUnits(resident, INITIAL_UNITS, property).map((unit) => unit.id), ['A2']);
});
