import { BankTransaction, Expense, PaymentLedger, Unit, DistributionRule } from '../types';
import {
  allocatePayment,
  createLedgerFromStatements
} from './calculationCore';
import { buildStatements } from './propertyStatementAdapter';

export function createPaymentLedgerEntryFromBankMatch({
  transaction,
  unitId,
  amount
}: {
  transaction: BankTransaction;
  unitId: string;
  amount: number;
}): PaymentLedger {
  return {
    id: `pay-${Date.now()}`,
    date: transaction.date,
    payer: transaction.suggestedOwner || 'Τραπεζικό Έμβασμα',
    unit: unitId,
    paymentCode: `TX-${transaction.ref}`,
    amount,
    method: 'Τράπεζα',
    matchType: 'ΑΥΤΟΜΑΤΗ',
    status: 'Ολοκληρώθηκε'
  };
}

export function calculateBalanceAfterPayment({
  unitId,
  paymentAmount,
  period,
  units,
  expenses,
  rules
}: {
  unitId: string;
  paymentAmount: number;
  period: string;
  units: Unit[];
  expenses: Expense[];
  rules: DistributionRule[];
}): number {
  const statements = buildStatements({ period, units, expenses, rules });
  const ledgerEntries = createLedgerFromStatements(statements);
  const result = allocatePayment({
    payment: {
      id: `preview-${unitId}`,
      unitCode: unitId,
      amount: paymentAmount
    },
    statements,
    ledgerEntries
  });

  return Math.max(
    0,
    result.ledgerEntries
      .filter((entry) => entry.unitCode === unitId)
      .reduce((sum, entry) => sum + entry.amount, 0)
  );
}
