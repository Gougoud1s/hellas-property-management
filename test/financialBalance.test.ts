import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_EXPENSES, INITIAL_PAYMENT_LEDGER, INITIAL_PROPERTIES,
  INITIAL_RULES, INITIAL_UNITS, PaymentLedger, StatementBatch,
} from '../src/types';
import { reconcilePropertyDues, reconcileUnitBalances } from '../src/lib/financialBalance';

const tenantId = 'tenant-anastassiadis';

function reconcile(payments = INITIAL_PAYMENT_LEDGER, batches: StatementBatch[] = [], expenses = INITIAL_EXPENSES) {
  return reconcileUnitBalances({
    properties: INITIAL_PROPERTIES.filter((item) => item.tenantId === tenantId),
    units: INITIAL_UNITS.filter((item) => item.tenantId === tenantId),
    expenses: expenses.filter((item) => item.tenantId === tenantId),
    rules: INITIAL_RULES.filter((item) => item.tenantId === tenantId),
    statementBatches: batches,
    payments: payments.filter((item) => item.tenantId === tenantId),
  });
}

test('every Anastassiadis unit uses the authoritative derived balance', () => {
  const reconciled = reconcile();
  const expected: Record<string, number> = {
    'ANA-IL-01/A1': 143.96, 'ANA-IL-01/A2': 85.22,
    'ANA-IL-01/B1': 216.13, 'ANA-IL-01/B2': 69.94,
    'ANA-IL-01/C1': 186.57, 'ANA-IL-01/C2': 0,
    'ANA-GL-02/G1': 99.64, 'ANA-GL-02/G2': 294.26,
    'ANA-AT-03/L1': 86, 'ANA-AT-03/L2': 130,
  };
  for (const unit of reconciled) {
    const key = `${unit.propertyId}/${unit.id}`;
    assert.equal(unit.balance, expected[key], `${key} balance drifted`);
    assert.equal(unit.balance, INITIAL_UNITS.find((seed) => seed.tenantId === tenantId && seed.propertyId === unit.propertyId && seed.id === unit.id)?.balance, `${key} seed is stale`);
  }
});

test('a completed payment changes every consumer through reconciliation without editing the unit', () => {
  const payment: PaymentLedger = {
    id: 'payment-a2', tenantId, propertyId: 'ANA-IL-01', period: 'Ιούλιος 2026',
    date: '2026-07-19', payer: 'Αλέξανδρος Ρήγας', unit: 'A2', paymentCode: 'TEST-A2',
    amount: 25, method: 'Τράπεζα', matchType: 'ΑΥΤΟΜΑΤΗ', status: 'Ολοκληρώθηκε',
  };
  const before = INITIAL_UNITS.find((unit) => unit.tenantId === tenantId && unit.propertyId === 'ANA-IL-01' && unit.id === 'A2');
  const after = reconcile([...INITIAL_PAYMENT_LEDGER, payment]).find((unit) => unit.propertyId === 'ANA-IL-01' && unit.id === 'A2');
  assert.equal(before?.balance, 85.22, 'stored unit was not mutated by the payment');
  assert.equal(after?.balance, 60.22);
});

test('draft expenses do not silently change issued balances; corrective batches do', () => {
  const initial: StatementBatch = {
    id: 'initial', tenantId, propertyId: 'ANA-IL-01', period: 'Ιούλιος 2026', sequence: 0,
    kind: 'initial', expenseIds: ['ana-exp-1', 'ana-exp-2', 'ana-exp-3'], unitCharges: {}, createdAt: '2026-07-12T09:00:00Z',
  };
  const before = reconcile(INITIAL_PAYMENT_LEDGER, [initial]).find((unit) => unit.propertyId === 'ANA-IL-01' && unit.id === 'A2');
  const correction: StatementBatch = {
    id: 'correction', tenantId, propertyId: 'ANA-IL-01', period: 'Ιούλιος 2026', sequence: 1,
    kind: 'correction', reason: 'ΕΥΔΑΠ', expenseIds: ['ana-exp-4'], unitCharges: {}, createdAt: '2026-07-20T09:00:00Z',
  };
  const verified = INITIAL_EXPENSES.map((expense) => expense.id === 'ana-exp-4' ? { ...expense, status: 'Verified' as const } : expense);
  const after = reconcile(INITIAL_PAYMENT_LEDGER, [initial, correction], verified).find((unit) => unit.propertyId === 'ANA-IL-01' && unit.id === 'A2');
  assert.equal(before?.balance, 85.22);
  assert.ok((after?.balance ?? 0) > 85.22);
});

test('property dues are the exact sum of reconciled unit balances', () => {
  const units = reconcile();
  const properties = reconcilePropertyDues(INITIAL_PROPERTIES.filter((item) => item.tenantId === tenantId), units);
  for (const property of properties) {
    const expected = Math.round(units.filter((unit) => unit.propertyId === property.id).reduce((sum, unit) => sum + unit.balance, 0) * 100) / 100;
    assert.equal(property.dues, expected, property.id);
  }
});

test('an unrelated property with a missing rule cannot crash tenant reconciliation', () => {
  const property = { ...INITIAL_PROPERTIES.find((item) => item.tenantId === tenantId && item.id === 'ANA-IL-01')!, id: 'incomplete' };
  const unit = { ...INITIAL_UNITS.find((item) => item.tenantId === tenantId && item.propertyId === 'ANA-IL-01' && item.id === 'A1')!, propertyId: 'incomplete', balance: 12.34 };
  const expense = { ...INITIAL_EXPENSES.find((item) => item.tenantId === tenantId && item.propertyId === 'ANA-IL-01')!, propertyId: 'incomplete', category: 'Χωρίς κανόνα' };
  const result = reconcileUnitBalances({ properties: [property], units: [unit], expenses: [expense], rules: [], statementBatches: [], payments: [] });
  assert.equal(result[0].balance, 12.34);
});
