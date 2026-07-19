import { DistributionRule, Expense, PaymentLedger, Property, StatementBatch, Unit } from '../types';
import { buildStatements, getIssuedExpenses } from './propertyStatementAdapter';

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export interface FinancialBalanceInput {
  properties: Property[];
  units: Unit[];
  expenses: Expense[];
  rules: DistributionRule[];
  statementBatches: StatementBatch[];
  payments: PaymentLedger[];
}

/**
 * Produces the only balance representation screens may consume.
 * A published period is opening balance + immutable issued charges - completed
 * payments for that period. Draft expenses never alter an issued balance.
 */
export function reconcileUnitBalances(input: FinancialBalanceInput): Unit[] {
  const { properties, units, expenses, rules, statementBatches, payments } = input;
  return units.map((unit) => {
    const property = properties.find((item) => item.id === unit.propertyId && item.tenantId === unit.tenantId);
    if (!property || property.status !== 'Published') return { ...unit, balance: money(unit.prevBalance) };

    const propertyUnits = units.filter((item) => item.tenantId === unit.tenantId && item.propertyId === property.id);
    const propertyBatches = statementBatches.filter((batch) =>
      batch.tenantId === unit.tenantId && batch.propertyId === property.id && batch.period === property.period
    );
    const verifiedExpenses = expenses.filter((expense) =>
      expense.tenantId === unit.tenantId && expense.propertyId === property.id && expense.status === 'Verified'
    );
    const issuedExpenses = propertyBatches.length ? getIssuedExpenses(verifiedExpenses, propertyBatches) : verifiedExpenses;
    let statement;
    try {
      statement = buildStatements({
        period: property.period,
        units: propertyUnits,
        expenses: issuedExpenses,
        rules: rules.filter((rule) =>
          (!rule.tenantId || rule.tenantId === unit.tenantId) && rule.propertyId === property.id
        ),
      }).find((item) => item.unitCode === unit.id);
    } catch (error) {
      // One incompletely configured property must not take down another tenant.
      // Issuance itself remains fail-closed and will still reject missing rules.
      if (import.meta.env?.DEV) console.warn(`Balance reconciliation skipped for ${property.id}:`, error);
      return { ...unit };
    }
    if (!statement) return { ...unit, balance: money(unit.prevBalance) };

    const paid = payments.filter((payment) =>
      payment.tenantId === unit.tenantId
      && payment.propertyId === property.id
      && payment.unit === unit.id
      && payment.status === 'Ολοκληρώθηκε'
      && (!payment.period || payment.period === property.period)
    ).reduce((sum, payment) => sum + payment.amount, 0);

    return { ...unit, balance: Math.max(0, money(statement.totalDue - paid)) };
  });
}

export function reconcilePropertyDues(properties: Property[], units: Unit[]): Property[] {
  return properties.map((property) => ({
    ...property,
    dues: money(units
      .filter((unit) => unit.tenantId === property.tenantId && unit.propertyId === property.id)
      .reduce((sum, unit) => sum + Math.max(0, unit.balance), 0)),
  }));
}
