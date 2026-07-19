import { DistributionRule, Expense, StatementBatch, Unit } from '../types';
import {
  CalculationExpense,
  CalculationRule,
  CalculationUnit,
  GeneratedStatement,
  calculateExpenseAllocation,
  generateStatements,
  roundMoney,
  sumMoney
} from './calculationCore';
import { participationFactor } from './unitParticipation';

export interface CategoryTotal {
  category: string;
  amount: number;
}

export type ChargeResponsibility = 'owner' | 'resident_or_tenant';

export interface ResponsibilityResolution {
  responsibleParty: ChargeResponsibility;
  payerName: string;
  label: string;
  fallbackApplied: boolean;
}

export function getIssuedExpenses(expenses: Expense[], batches: StatementBatch[]): Expense[] {
  const issuedIds = new Set(batches.flatMap((batch) => batch.expenseIds));
  return expenses.filter((expense) => expense.status === 'Verified' && issuedIds.has(expense.id));
}

export function normalizeExpenseCategory(category: string): string {
  if (category.includes('Ασανσέρ') || category.includes('Lift') || category.includes('Ανελκυστήρ')) return 'Ασανσέρ';
  if (category.includes('Κήπ') || category.includes('Gard') || category.includes('Κηπουρ')) return 'Κήπος';
  if (category.includes('Καθαριότητα') || category.includes('Clean')) return 'Καθαριότητα';
  if (category.includes('Θέρμανση') || category.includes('Πετρέλαιο')) return 'Θέρμανση';
  if (category.includes('Πισίνα')) return 'Πισίνα';
  return 'Γενικά';
}

export function toCalculationUnits(units: Unit[], period?: string): (CalculationUnit & { responsiblePerson: string })[] {
  return units.map((unit) => ({
    code: unit.id,
    responsiblePerson: unit.residentName || unit.ownerName,
    weights: {
      general: unit.share * (period ? participationFactor(unit, period) : 1),
      elevator: (unit.floor === 'Ισόγειο' ? 0 : unit.share) * (period ? participationFactor(unit, period) : 1),
      garden: unit.share * (period ? participationFactor(unit, period) : 1),
      heating: unit.size * (period ? participationFactor(unit, period) : 1),
      pool: (unit.status === 'Ενεργό' ? 1 : 0) * (period ? participationFactor(unit, period) : 1),
      people: getResidentsCount(unit) * (period ? participationFactor(unit, period) : 1),
      equal: (unit.status === 'Ενεργό' ? 1 : 0) * (period ? participationFactor(unit, period) : 1)
    }
  }));
}

export function toCalculationExpenses(expenses: Expense[]): CalculationExpense[] {
  const categoryTotals = expenses
    .filter((expense) => expense.status === 'Verified')
    .reduce<Record<string, number>>((acc, expense) => {
      const category = normalizeExpenseCategory(expense.category);
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});

  return Object.entries(categoryTotals).map(([categoryCode, amount], index) => ({
    id: `category-${index + 1}`,
    categoryCode,
    amount: roundMoney(amount)
  }));
}

export function getCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  return toCalculationExpenses(expenses).map((expense) => ({
    category: expense.categoryCode,
    amount: expense.amount
  }));
}

export function toCalculationRules(rules: DistributionRule[]): CalculationRule[] {
  return rules.map((rule) => {
    const isElevator = rule.category === 'Ασανσέρ';
    const method = rule.method === 'Ισομερής Κατανομή' ? 'equal' : 'weights';

    return {
      categoryCode: normalizeExpenseCategory(rule.category),
      method,
      weightKey: method === 'equal' ? 'equal' : weightKeyForMethod(rule),
      responsibleParty: getCategoryResponsibility(rule.category),
      excludedUnitCodes: isElevator ? undefined : []
    };
  });
}

export function buildStatements({
  period,
  units,
  expenses,
  rules
}: {
  period: string;
  units: Unit[];
  expenses: Expense[];
  rules: DistributionRule[];
}): GeneratedStatement[] {
  return generateStatements({
    period,
    units: toCalculationUnits(units, period),
    expenses: toCalculationExpenses(expenses),
    rules: toCalculationRules(rules),
    openingBalances: units
      .filter((unit) => unit.prevBalance > 0)
      .map((unit) => ({ unitCode: unit.id, amount: unit.prevBalance }))
  });
}

export function calculateCategoryShare({
  unit,
  category,
  amount,
  units,
  rules
}: {
  unit: Unit;
  category: string;
  amount: number;
  units: Unit[];
  rules: DistributionRule[];
}): number {
  const calculationUnits = toCalculationUnits(units);
  const rule = toCalculationRules(rules).find((candidate) => candidate.categoryCode === category);
  if (!rule) return 0;

  const lines = calculateExpenseAllocation({
    expense: { id: `preview-${category}`, categoryCode: category, amount },
    rule,
    units: calculationUnits
  });
  return lines.find((line) => line.unitCode === unit.id)?.amount || 0;
}

export function calculateSimulationRows({
  category,
  amount,
  units,
  rules
}: {
  category: string;
  amount: number;
  units: Unit[];
  rules: DistributionRule[];
}) {
  const calculationUnits = toCalculationUnits(units);
  const rule = toCalculationRules(rules).find((candidate) => candidate.categoryCode === category);
  if (!rule) return [];

  return calculateExpenseAllocation({
    expense: { id: `sim-${category}`, categoryCode: category, amount },
    rule,
    units: calculationUnits
  });
}

export function getResidentsCount(unit: Unit): number {
  if (unit.residentType === 'Κενό') return 0;
  return Math.max(1, Math.floor(unit.occupants ?? 1));
}

export function statementCurrentCharges(statement: GeneratedStatement): number {
  return sumMoney(statement.lines.map((line) => line.amount));
}

export function getCategoryResponsibility(category: string): ChargeResponsibility {
  if (
    category.includes('Αποθεματικό') ||
    category.includes('Ασφάλεια') ||
    category.includes('Επισκευ') ||
    category.includes('Major')
  ) {
    return 'owner';
  }

  return 'resident_or_tenant';
}

export function resolveChargeResponsibility(unit: Unit, responsibleParty: ChargeResponsibility): ResponsibilityResolution {
  if (responsibleParty === 'owner') {
    return {
      responsibleParty,
      payerName: unit.ownerName,
      label: 'Ιδιοκτήτης',
      fallbackApplied: false
    };
  }

  if (unit.residentType === 'Κενό' || !unit.residentName) {
    return {
      responsibleParty,
      payerName: unit.ownerName,
      label: 'Ιδιοκτήτης λόγω κενού διαμερίσματος',
      fallbackApplied: true
    };
  }

  return {
    responsibleParty,
    payerName: unit.residentName,
    label: unit.residentType === 'Ενοικιαστής' ? 'Ενοικιαστής' : 'Κάτοικος',
    fallbackApplied: false
  };
}

function weightKeyForMethod(rule: DistributionRule): string {
  if (rule.category === 'Ασανσέρ') return 'elevator';
  if (rule.category === 'Κήπος') return 'garden';
  if (rule.category === 'Θέρμανση' || rule.method === 'Βάσει Εμβαδού') return 'heating';
  if (rule.category === 'Πισίνα') return 'pool';
  if (rule.method === 'Βάσει Ατόμων') return 'people';
  return 'general';
}
