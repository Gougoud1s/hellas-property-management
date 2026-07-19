import { AuthUser } from './auth';
import {
  BankTransaction,
  Document,
  Expense,
  Issue,
  PaymentLedger,
  Property,
  Unit
} from '../types';

const DEFAULT_TENANT_ID = 'tenant-hellas-pm';
const DEFAULT_PROPERTY_ID = 'ATH-0226';

type ScopedEntity = {
  tenantId?: string;
  propertyId?: string;
};

function getUserTenantId(user: AuthUser): string {
  return user.tenantId || DEFAULT_TENANT_ID;
}

function entityTenantMatches(user: AuthUser, entity: ScopedEntity): boolean {
  return (entity.tenantId || DEFAULT_TENANT_ID) === getUserTenantId(user);
}

function resolvePropertyId(entity: ScopedEntity, propertyName?: string, properties: Property[] = []): string {
  if (entity.propertyId) return entity.propertyId;
  if (propertyName) {
    const matched = properties.find((property) => property.name === propertyName);
    if (matched) return matched.id;
  }
  return DEFAULT_PROPERTY_ID;
}

function userPropertyIds(user: AuthUser): string[] | null {
  if (user.role === 'company_admin') return null;
  if (user.role === 'company_staff') return user.propertyIds?.length ? user.propertyIds : null;
  return user.propertyIds && user.propertyIds.length > 0 ? user.propertyIds : [DEFAULT_PROPERTY_ID];
}

function userUnitIds(user: AuthUser): string[] | null {
  if (user.role === 'company_admin' || user.role === 'company_staff') return null;
  return user.unitIds && user.unitIds.length > 0 ? user.unitIds : [];
}

export function isCompanyUser(user: AuthUser): boolean {
  return user.role === 'company_admin' || user.role === 'company_staff';
}

export function getVisibleProperties(user: AuthUser, properties: Property[]): Property[] {
  const allowedProperties = userPropertyIds(user);

  return properties.filter((property) => {
    if (!entityTenantMatches(user, property)) return false;
    return allowedProperties === null || allowedProperties.includes(property.id);
  });
}

export function getDefaultVisibleProperty(user: AuthUser, properties: Property[]): Property | null {
  const visibleProperties = getVisibleProperties(user, properties);
  return visibleProperties[0] || null;
}

export function getScopedSelectedProperty(
  user: AuthUser,
  selectedProperty: Property | null,
  properties: Property[]
): Property | null {
  const visibleProperties = getVisibleProperties(user, properties);
  if (!selectedProperty) return visibleProperties[0] || null;
  return visibleProperties.find((property) => property.id === selectedProperty.id) || visibleProperties[0] || null;
}

export function getVisibleUnits(user: AuthUser, units: Unit[], selectedProperty: Property | null): Unit[] {
  if (!selectedProperty) return [];

  const allowedUnits = userUnitIds(user);
  return units.filter((unit) => {
    if (!entityTenantMatches(user, unit)) return false;
    const propertyId = resolvePropertyId(unit);
    if (propertyId !== selectedProperty.id) return false;
    return allowedUnits === null || allowedUnits.includes(unit.id);
  });
}

export function getPropertyUnits(user: AuthUser, units: Unit[], selectedProperty: Property | null): Unit[] {
  if (!selectedProperty) return [];

  return units.filter((unit) => {
    if (!entityTenantMatches(user, unit)) return false;
    return resolvePropertyId(unit) === selectedProperty.id;
  });
}

export function getVisibleExpenses(user: AuthUser, expenses: Expense[], selectedProperty: Property | null): Expense[] {
  if (!selectedProperty) return [];

  return expenses.filter((expense) => {
    if (!entityTenantMatches(user, expense)) return false;
    return resolvePropertyId(expense) === selectedProperty.id;
  });
}

export function getVisibleIssues(
  user: AuthUser,
  issues: Issue[],
  selectedProperty: Property | null,
  properties: Property[]
): Issue[] {
  if (!selectedProperty) return [];
  const allowedUnits = userUnitIds(user);

  return issues.filter((issue) => {
    if (!entityTenantMatches(user, issue)) return false;
    if (resolvePropertyId(issue, issue.property, properties) !== selectedProperty.id) return false;
    if (allowedUnits === null) return true;
    return !issue.unitId || allowedUnits.includes(issue.unitId);
  });
}

export function getVisibleBankTransactions(
  user: AuthUser,
  bankTransactions: BankTransaction[],
  selectedProperty: Property | null
): BankTransaction[] {
  if (!selectedProperty || !isCompanyUser(user)) return [];

  return bankTransactions.filter((transaction) => {
    if (!entityTenantMatches(user, transaction)) return false;
    return resolvePropertyId(transaction) === selectedProperty.id;
  });
}

export function getVisiblePaymentLedger(
  user: AuthUser,
  paymentLedger: PaymentLedger[],
  selectedProperty: Property | null
): PaymentLedger[] {
  if (!selectedProperty) return [];
  const allowedUnits = userUnitIds(user);

  return paymentLedger.filter((payment) => {
    if (!entityTenantMatches(user, payment)) return false;
    if (resolvePropertyId(payment) !== selectedProperty.id) return false;
    return allowedUnits === null || allowedUnits.includes(payment.unit);
  });
}

export function getVisibleDocuments(
  user: AuthUser,
  documents: Document[],
  selectedProperty: Property | null,
  properties: Property[]
): Document[] {
  if (!selectedProperty) return [];

  return documents.filter((document) => {
    if (!entityTenantMatches(user, document)) return false;
    if (resolvePropertyId(document, document.property, properties) !== selectedProperty.id) return false;
    if (isCompanyUser(user)) return true;
    if (user.role === 'owner') return document.visibility === 'Ιδιοκτήτες' || document.visibility === 'Όλοι';
    return document.visibility === 'Όλοι';
  });
}

export function describeUserScope(user: AuthUser, units: Unit[], selectedProperty: Property | null): string {
  if (isCompanyUser(user)) return 'Έχετε πρόσβαση στα κτίρια της εταιρείας σας.';
  const visibleUnits = getVisibleUnits(user, units, selectedProperty);
  if (visibleUnits.length === 0) return 'Δεν έχει συνδεθεί μονάδα με τον λογαριασμό σας.';
  const unitCodes = visibleUnits.map((unit) => unit.id).join(', ');
  return `Συνδεδεμένες μονάδες: ${unitCodes}`;
}
