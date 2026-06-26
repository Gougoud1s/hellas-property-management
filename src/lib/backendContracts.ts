import {
  BankTransaction,
  DistributionRule,
  Document,
  Expense,
  Issue,
  PaymentLedger,
  Property,
  TenantRegistrationRequest,
  Unit
} from '../types';
import { AuthUser } from './auth';

export interface TenantSnapshot {
  properties: Property[];
  units: Unit[];
  expenses: Expense[];
  rules: DistributionRule[];
  issues: Issue[];
  bankTransactions: BankTransaction[];
  paymentLedger: PaymentLedger[];
  documents: Document[];
  users: AuthUser[];
  tenantRequests: TenantRegistrationRequest[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signIn(credentials: LoginCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export interface TenantDataRepository {
  loadSnapshot(user: AuthUser): Promise<TenantSnapshot>;
  inviteUser(actor: AuthUser, user: AuthUser): Promise<AuthUser>;
  updateUser(actor: AuthUser, user: AuthUser): Promise<AuthUser>;
  updateOwnProfile(user: AuthUser): Promise<AuthUser>;
  approveTenantRequest(actor: AuthUser, requestId: string): Promise<TenantRegistrationRequest>;
  createProperty(user: AuthUser, property: Omit<Property, 'id' | 'issuesCount' | 'dues' | 'status'>): Promise<Property>;
  createUnit(user: AuthUser, propertyId: string, unit: Unit): Promise<Unit>;
  updateUnit(user: AuthUser, propertyId: string, unit: Unit): Promise<Unit>;
  createExpense(user: AuthUser, propertyId: string, expense: Expense): Promise<Expense>;
  deleteExpense(user: AuthUser, expenseId: string): Promise<void>;
  updateExpenseStatus(user: AuthUser, expenseId: string, status: Expense['status']): Promise<Expense>;
  updateRule(user: AuthUser, propertyId: string, rule: DistributionRule): Promise<DistributionRule>;
  createIssue(user: AuthUser, propertyId: string, issue: Issue): Promise<Issue>;
  updateIssue(user: AuthUser, issueId: string, patch: Partial<Issue>): Promise<Issue>;
  reconcileBankPayment(user: AuthUser, transactionId: string, unitId: string, amount: number): Promise<PaymentLedger>;
  createCashPayment(user: AuthUser, propertyId: string, unitId: string, amount: number, payer: string): Promise<PaymentLedger>;
  createDocument(user: AuthUser, propertyId: string, document: Document): Promise<Document>;
  deleteDocument(user: AuthUser, documentId: string): Promise<void>;
  publishStatements(user: AuthUser, propertyId: string, period: string): Promise<void>;
}

export type DataMode = 'local-demo' | 'supabase';

export function getConfiguredDataMode(): DataMode {
  const mode = import.meta.env.VITE_DATA_MODE;
  return mode === 'supabase' ? 'supabase' : 'local-demo';
}
