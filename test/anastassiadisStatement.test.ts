import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_EXPENSES, INITIAL_PROPERTIES, INITIAL_RULES, INITIAL_UNITS } from '../src/types';
import { buildStatements, getIssuedExpenses, getResidentsCount } from '../src/lib/propertyStatementAdapter';
import { Expense, StatementBatch, Unit } from '../src/types';

test('owner A1 sees the exact same Ilioupoli statement calculated for the full building', () => {
  const property = INITIAL_PROPERTIES.find((item) => item.id === 'ANA-IL-01');
  assert.ok(property);
  const statement = buildStatements({
    period: property.period,
    units: INITIAL_UNITS.filter((unit) => unit.propertyId === property.id),
    expenses: INITIAL_EXPENSES.filter((expense) => expense.propertyId === property.id),
    rules: INITIAL_RULES.filter((rule) => rule.propertyId === property.id),
  }).find((item) => item.unitCode === 'A1');

  assert.ok(statement);
  assert.equal(statement.currentCharges, 105.46);
  assert.equal(statement.previousBalance, 38.5);
  assert.equal(statement.totalDue, 143.96);
});

test('resident A2 dashboard balance matches the issued Ilioupoli statement', () => {
  const property = INITIAL_PROPERTIES.find((item) => item.id === 'ANA-IL-01');
  const unit = INITIAL_UNITS.find((item) => item.tenantId === 'tenant-anastassiadis' && item.propertyId === 'ANA-IL-01' && item.id === 'A2');
  assert.ok(property);
  assert.ok(unit);
  const statement = buildStatements({
    period: property.period,
    units: INITIAL_UNITS.filter((item) => item.tenantId === unit.tenantId && item.propertyId === property.id),
    expenses: INITIAL_EXPENSES.filter((expense) => expense.tenantId === unit.tenantId && expense.propertyId === property.id),
    rules: INITIAL_RULES.filter((rule) => rule.tenantId === unit.tenantId && rule.propertyId === property.id),
  }).find((item) => item.unitCode === unit.id);

  assert.ok(statement);
  assert.equal(statement.totalDue, 85.22);
  assert.equal(unit.balance, statement.totalDue);
});

test('per-person allocation uses unit data, never a hardcoded unit code', () => {
  const unit = {
    ...INITIAL_UNITS.find((item) => item.id === 'A1')!,
    propertyId: 'another-building',
    occupants: 1,
  } satisfies Unit;
  assert.equal(getResidentsCount(unit), 1);
  assert.equal(getResidentsCount({ ...unit, occupants: 5 }), 5);
  assert.equal(getResidentsCount({ ...unit, residentType: 'Κενό', occupants: 5 }), 0);
});

test('every seeded unit has a valid occupant count', () => {
  for (const unit of INITIAL_UNITS) {
    assert.equal(Number.isInteger(unit.occupants), true, `${unit.propertyId}/${unit.id} must have an integer occupant count`);
    assert.equal(
      unit.residentType === 'Κενό' ? unit.occupants === 0 : (unit.occupants ?? 0) >= 1,
      true,
      `${unit.propertyId}/${unit.id} has an invalid occupant count for ${unit.residentType}`,
    );
  }
});

test('owner statements exclude verified expenses until a corrective batch is issued', () => {
  const expenses: Expense[] = [
    { id: 'issued', date: '2026-07-01', supplier: 'A', category: 'Γενικά', amount: 100, status: 'Verified' },
    { id: 'late', date: '2026-07-20', supplier: 'B', category: 'Γενικά', amount: 50, status: 'Verified' },
  ];
  const batches: StatementBatch[] = [{
    id: 'initial', tenantId: 'tenant', propertyId: 'property', period: 'Ιούλιος 2026',
    sequence: 0, kind: 'initial', expenseIds: ['issued'], unitCharges: {}, createdAt: '2026-07-10T00:00:00Z'
  }];

  assert.deepEqual(getIssuedExpenses(expenses, batches).map((expense) => expense.id), ['issued']);
  batches.push({
    id: 'correction', tenantId: 'tenant', propertyId: 'property', period: 'Ιούλιος 2026',
    sequence: 1, kind: 'correction', reason: 'Late invoice', expenseIds: ['late'], unitCharges: {}, createdAt: '2026-07-20T00:00:00Z'
  });
  assert.deepEqual(getIssuedExpenses(expenses, batches).map((expense) => expense.id), ['issued', 'late']);
});
