import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundMoney,
  sumMoney,
  calculateWeightedAllocation,
  calculateEqualAllocation,
  calculateExpenseAllocation,
  generateStatements,
  createLedgerFromStatements,
  calculateLedgerBalance,
  allocatePayment,
  CalculationUnit,
  CalculationRule,
} from '../src/lib/calculationCore';

// ── Money rounding ────────────────────────────────────────────────────────────

test('roundMoney rounds to two decimals and kills float noise', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(1.005), 1.01);
  assert.equal(roundMoney(2.675), 2.68);
  assert.equal(roundMoney(-1.005), -1);
});

test('sumMoney sums then rounds once', () => {
  assert.equal(sumMoney([0.1, 0.2, 0.3]), 0.6);
  assert.equal(sumMoney([33.33, 33.33, 33.34]), 100);
});

// ── Weighted allocation ─────────────────────────────────────────────────────────

const mkUnit = (code: string, general: number): CalculationUnit => ({
  code,
  weights: { general },
});

test('weighted allocation distributes the full amount with no cent lost', () => {
  const units = [mkUnit('A', 1), mkUnit('B', 1), mkUnit('C', 1)];
  const result = calculateWeightedAllocation({
    amount: 100,
    units,
    getWeight: (u) => u.weights.general,
  });
  const total = sumMoney(result.lines.map((l) => l.amount));
  assert.equal(total, 100, 'allocated total must equal the expense exactly');
  assert.equal(result.roundingDelta, 0);
  // The rounding remainder lands on the last participating line.
  assert.equal(result.lines[2].amount, 33.34);
});

test('weighted allocation with uneven weights still totals exactly', () => {
  const units = [mkUnit('A', 120), mkUnit('B', 180), mkUnit('C', 330)];
  const result = calculateWeightedAllocation({
    amount: 87.63,
    units,
    getWeight: (u) => u.weights.general,
  });
  assert.equal(sumMoney(result.lines.map((l) => l.amount)), 87.63);
});

test('weighted allocation with zero total weight charges nobody', () => {
  const units = [mkUnit('A', 0), mkUnit('B', 0)];
  const result = calculateWeightedAllocation({
    amount: 50,
    units,
    getWeight: (u) => u.weights.general,
  });
  assert.equal(result.roundingDelta, 50);
  assert.ok(result.lines.every((l) => l.amount === 0 && !l.participates));
});

// ── Equal allocation ────────────────────────────────────────────────────────────

test('equal allocation splits evenly and absorbs the remainder', () => {
  const units: CalculationUnit[] = [
    { code: 'A', weights: {} },
    { code: 'B', weights: {} },
    { code: 'C', weights: {} },
  ];
  const result = calculateEqualAllocation({ amount: 100, units });
  assert.equal(sumMoney(result.lines.map((l) => l.amount)), 100);
});

test('equal allocation skips excluded units', () => {
  const units: CalculationUnit[] = [
    { code: 'A', weights: {} },
    { code: 'B', weights: {}, excluded: true },
  ];
  const result = calculateEqualAllocation({ amount: 60, units });
  const byCode = Object.fromEntries(result.lines.map((l) => [l.unit.code, l.amount]));
  assert.equal(byCode.A, 60);
  assert.equal(byCode.B, 0);
});

// ── Expense allocation (rule dispatch) ──────────────────────────────────────────

test('expense allocation honours excludedUnitCodes for weighted rules', () => {
  const units = [mkUnit('A', 100), mkUnit('B', 100), mkUnit('P1', 100)];
  const rule: CalculationRule = {
    categoryCode: 'elevator',
    method: 'weights',
    weightKey: 'general',
    responsibleParty: 'owner',
    excludedUnitCodes: ['P1'],
  };
  const lines = calculateExpenseAllocation({
    expense: { id: 'e1', categoryCode: 'elevator', amount: 100 },
    rule,
    units,
  });
  const p1 = lines.find((l) => l.unitCode === 'P1');
  assert.equal(p1?.amount, 0, 'ground-floor unit excluded from elevator cost');
  assert.equal(sumMoney(lines.map((l) => l.amount)), 100);
});

// ── Statements ──────────────────────────────────────────────────────────────────

test('generateStatements charges, carries opening balances, and totals due', () => {
  const units = [mkUnit('A', 1), mkUnit('B', 1)];
  const rules: CalculationRule[] = [
    { categoryCode: 'general', method: 'weights', weightKey: 'general', responsibleParty: 'owner' },
  ];
  const statements = generateStatements({
    period: '2026-06',
    units,
    expenses: [{ id: 'e1', categoryCode: 'general', amount: 100 }],
    rules,
    openingBalances: [{ unitCode: 'A', amount: 50 }],
  });
  const a = statements.find((s) => s.unitCode === 'A')!;
  const b = statements.find((s) => s.unitCode === 'B')!;
  assert.equal(a.currentCharges, 50);
  assert.equal(a.previousBalance, 50);
  assert.equal(a.totalDue, 100);
  assert.equal(b.totalDue, 50);
  // Charges across the building must reconcile to the expense.
  assert.equal(sumMoney(statements.map((s) => s.currentCharges)), 100);
});

test('generateStatements throws when a category has no rule', () => {
  assert.throws(
    () =>
      generateStatements({
        period: '2026-06',
        units: [mkUnit('A', 1)],
        expenses: [{ id: 'e1', categoryCode: 'mystery', amount: 10 }],
        rules: [],
      }),
    /Missing allocation rule/,
  );
});

// ── Payment allocation ──────────────────────────────────────────────────────────

function buildLedgerFor(charges: number) {
  const units = [mkUnit('A', 1)];
  const rules: CalculationRule[] = [
    { categoryCode: 'general', method: 'weights', weightKey: 'general', responsibleParty: 'owner' },
  ];
  const statements = generateStatements({
    period: '2026-06',
    units,
    expenses: [{ id: 'e1', categoryCode: 'general', amount: charges }],
    rules,
  });
  return { statements, ledgerEntries: createLedgerFromStatements(statements) };
}

test('exact payment clears the balance', () => {
  const { statements, ledgerEntries } = buildLedgerFor(100);
  const result = allocatePayment({
    payment: { id: 'p1', unitCode: 'A', amount: 100 },
    statements,
    ledgerEntries,
  });
  assert.equal(result.status, 'allocated');
  assert.equal(calculateLedgerBalance(result.ledgerEntries, 'A'), 0);
});

test('partial payment leaves a positive remaining balance', () => {
  const { statements, ledgerEntries } = buildLedgerFor(100);
  const result = allocatePayment({
    payment: { id: 'p1', unitCode: 'A', amount: 40 },
    statements,
    ledgerEntries,
  });
  assert.equal(result.status, 'partially_allocated');
  assert.equal(calculateLedgerBalance(result.ledgerEntries, 'A'), 60);
});

test('overpayment produces a credit and never over-allocates', () => {
  const { statements, ledgerEntries } = buildLedgerFor(100);
  const result = allocatePayment({
    payment: { id: 'p1', unitCode: 'A', amount: 150 },
    statements,
    ledgerEntries,
  });
  assert.equal(result.status, 'credit_created');
  assert.equal(result.creditAmount, 50);
  assert.equal(calculateLedgerBalance(result.ledgerEntries, 'A'), -50, 'credit shows as negative balance');
});

test('payment with no unit is unmatched and mutates nothing', () => {
  const { statements, ledgerEntries } = buildLedgerFor(100);
  const result = allocatePayment({
    payment: { id: 'p1', unitCode: null, amount: 100 },
    statements,
    ledgerEntries,
  });
  assert.equal(result.status, 'unmatched');
  assert.deepEqual(result.ledgerEntries, ledgerEntries);
});
