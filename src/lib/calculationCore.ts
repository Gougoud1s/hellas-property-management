export type AllocationMethod = 'weights' | 'equal';

export interface CalculationUnit {
  code: string;
  weights: Record<string, number>;
  excluded?: boolean;
}

export interface CalculationExpense {
  id: string;
  categoryCode: string;
  amount: number;
}

export interface CalculationRule {
  categoryCode: string;
  method: AllocationMethod;
  weightKey?: string;
  responsibleParty: 'owner' | 'resident_or_tenant';
  excludedUnitCodes?: string[];
}

export interface OpeningBalance {
  unitCode: string;
  amount: number;
}

export interface AllocationLine {
  expenseId: string;
  categoryCode: string;
  unitCode: string;
  amount: number;
  method: AllocationMethod;
  responsibleParty: CalculationRule['responsibleParty'];
  participates: boolean;
  weight?: number;
  totalWeight?: number;
}

export interface GeneratedStatement {
  period: string;
  unitCode: string;
  responsiblePerson?: string;
  previousBalance: number;
  currentCharges: number;
  payments: number;
  credits: number;
  totalDue: number;
  lines: AllocationLine[];
}

export interface LedgerEntry {
  type: 'opening_balance' | 'charge' | 'payment' | 'credit';
  unitCode: string;
  amount: number;
  description: string;
  paymentId?: string;
}

export interface CalculationPayment {
  id: string;
  unitCode: string | null;
  amount: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}

export function calculateWeightedAllocation({
  amount,
  units,
  getWeight
}: {
  amount: number;
  units: CalculationUnit[];
  getWeight: (unit: CalculationUnit) => number;
}) {
  const rows = units.map((unit) => ({
    unit,
    weight: Number(getWeight(unit) || 0)
  }));
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);

  if (totalWeight <= 0) {
    return {
      totalWeight,
      lines: rows.map((row) => ({ ...row, amount: 0, participates: false })),
      roundingDelta: roundMoney(amount)
    };
  }

  const rawLines = rows.map((row) => ({
    ...row,
    amount: roundMoney((amount * row.weight) / totalWeight),
    participates: row.weight > 0
  }));
  const allocated = sumMoney(rawLines.map((line) => line.amount));
  const roundingDelta = roundMoney(amount - allocated);
  const lastParticipatingLine = [...rawLines].reverse().find((line) => line.participates);

  if (lastParticipatingLine && roundingDelta !== 0) {
    lastParticipatingLine.amount = roundMoney(lastParticipatingLine.amount + roundingDelta);
  }

  return {
    totalWeight,
    lines: rawLines,
    roundingDelta: 0
  };
}

export function calculateEqualAllocation({
  amount,
  units
}: {
  amount: number;
  units: CalculationUnit[];
}) {
  const eligibleUnits = units.filter((unit) => !unit.excluded);
  if (eligibleUnits.length === 0) {
    return {
      lines: units.map((unit) => ({ unit, amount: 0, participates: false })),
      roundingDelta: roundMoney(amount)
    };
  }

  const perUnit = roundMoney(amount / eligibleUnits.length);
  const lines = units.map((unit) => ({
    unit,
    amount: unit.excluded ? 0 : perUnit,
    participates: !unit.excluded
  }));
  const allocated = sumMoney(lines.map((line) => line.amount));
  const delta = roundMoney(amount - allocated);
  const lastLine = [...lines].reverse().find((line) => line.participates);

  if (lastLine && delta !== 0) {
    lastLine.amount = roundMoney(lastLine.amount + delta);
  }

  return { lines, roundingDelta: 0 };
}

export function calculateExpenseAllocation({
  expense,
  rule,
  units
}: {
  expense: CalculationExpense;
  rule: CalculationRule;
  units: CalculationUnit[];
}): AllocationLine[] {
  if (rule.method === 'equal') {
    const eligibleUnits = units.map((unit) => ({
      ...unit,
      excluded: rule.excludedUnitCodes?.includes(unit.code)
    }));

    return calculateEqualAllocation({ amount: expense.amount, units: eligibleUnits }).lines.map((line) => ({
      expenseId: expense.id,
      categoryCode: expense.categoryCode,
      unitCode: line.unit.code,
      amount: line.amount,
      method: rule.method,
      responsibleParty: rule.responsibleParty,
      participates: line.participates
    }));
  }

  const result = calculateWeightedAllocation({
    amount: expense.amount,
    units,
    getWeight: (unit) => {
      if (rule.excludedUnitCodes?.includes(unit.code)) return 0;
      return unit.weights?.[rule.weightKey || 'general'] || 0;
    }
  });

  return result.lines.map((line) => ({
    expenseId: expense.id,
    categoryCode: expense.categoryCode,
    unitCode: line.unit.code,
    amount: line.amount,
    weight: line.weight,
    totalWeight: result.totalWeight,
    method: rule.method,
    responsibleParty: rule.responsibleParty,
    participates: line.participates
  }));
}

export function generateStatements({
  period,
  units,
  expenses,
  rules,
  openingBalances = []
}: {
  period: string;
  units: (CalculationUnit & { responsiblePerson?: string })[];
  expenses: CalculationExpense[];
  rules: CalculationRule[];
  openingBalances?: OpeningBalance[];
}): GeneratedStatement[] {
  const lines = expenses.flatMap((expense) => {
    const rule = rules.find((candidate) => candidate.categoryCode === expense.categoryCode);
    if (!rule) {
      throw new Error(`Missing allocation rule for category: ${expense.categoryCode}`);
    }

    return calculateExpenseAllocation({ expense, rule, units }).filter((line) => line.amount > 0);
  });

  return units.map((unit) => {
    const statementLines = lines.filter((line) => line.unitCode === unit.code);
    const previousBalance = openingBalances
      .filter((entry) => entry.unitCode === unit.code)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const currentCharges = sumMoney(statementLines.map((line) => line.amount));

    return {
      period,
      unitCode: unit.code,
      responsiblePerson: unit.responsiblePerson,
      previousBalance: roundMoney(previousBalance),
      currentCharges,
      payments: 0,
      credits: 0,
      totalDue: roundMoney(previousBalance + currentCharges),
      lines: statementLines
    };
  });
}

export function createLedgerFromStatements(statements: GeneratedStatement[]): LedgerEntry[] {
  return statements.flatMap((statement) => {
    const entries: LedgerEntry[] = [];
    if (statement.previousBalance !== 0) {
      entries.push({
        type: 'opening_balance',
        unitCode: statement.unitCode,
        amount: statement.previousBalance,
        description: 'Opening balance'
      });
    }
    if (statement.currentCharges !== 0) {
      entries.push({
        type: 'charge',
        unitCode: statement.unitCode,
        amount: statement.currentCharges,
        description: `Statement charges for ${statement.period}`
      });
    }
    return entries;
  });
}

export function calculateLedgerBalance(entries: LedgerEntry[], unitCode: string): number {
  return roundMoney(
    entries
      .filter((entry) => entry.unitCode === unitCode)
      .reduce((sum, entry) => sum + entry.amount, 0)
  );
}

export function allocatePayment({
  payment,
  statements,
  ledgerEntries
}: {
  payment: CalculationPayment;
  statements: GeneratedStatement[];
  ledgerEntries: LedgerEntry[];
}) {
  if (!payment.unitCode) {
    return {
      status: 'unmatched' as const,
      allocations: [],
      ledgerEntries
    };
  }

  const statement = statements.find((candidate) => candidate.unitCode === payment.unitCode);
  if (!statement) {
    return {
      status: 'unmatched' as const,
      allocations: [],
      ledgerEntries
    };
  }

  const currentBalance = calculateLedgerBalance(ledgerEntries, payment.unitCode);
  const allocatedAmount = Math.min(payment.amount, Math.max(currentBalance, 0));
  const creditAmount = roundMoney(payment.amount - allocatedAmount);
  const nextEntries = [...ledgerEntries];

  if (allocatedAmount > 0) {
    nextEntries.push({
      type: 'payment',
      unitCode: payment.unitCode,
      paymentId: payment.id,
      amount: -roundMoney(allocatedAmount),
      description: 'Payment allocation'
    });
  }

  if (creditAmount > 0) {
    nextEntries.push({
      type: 'credit',
      unitCode: payment.unitCode,
      paymentId: payment.id,
      amount: -creditAmount,
      description: 'Overpayment credit'
    });
  }

  const status = creditAmount > 0
    ? 'credit_created'
    : allocatedAmount < currentBalance
      ? 'partially_allocated'
      : 'allocated';

  return {
    status,
    allocations: allocatedAmount > 0 ? [{ statementUnitCode: statement.unitCode, amount: roundMoney(allocatedAmount) }] : [],
    creditAmount,
    ledgerEntries: nextEntries
  };
}
