import {
  BankTransaction,
  AccountNotice,
  CalendarEvent,
  DistributionRule,
  Document,
  Expense,
  Issue,
  PaymentLedger,
  Property,
  StatementBatch,
  TenantRegistrationRequest,
  Unit
} from '../types';
import { AuthUser } from './auth';

export interface TenantSnapshot {
  tenantBranding?: { organizationName: string; logoUrl?: string };
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
  accountNotices: AccountNotice[];
  calendarEvents: CalendarEvent[];
  statementBatches: StatementBatch[];
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
  verifyMfa(code: string): Promise<AuthSession>;
}

export interface TenantDataRepository {
  loadSnapshot(user: AuthUser): Promise<TenantSnapshot>;
  inviteUser(actor: AuthUser, user: AuthUser): Promise<AuthUser>;
  updateUser(actor: AuthUser, user: AuthUser): Promise<AuthUser>;
  updateOwnProfile(user: AuthUser): Promise<AuthUser>;
  updateTenantBranding(user: AuthUser, branding: { organizationName: string; logoUrl?: string }): Promise<void>;
  approveTenantRequest(actor: AuthUser, requestId: string): Promise<TenantRegistrationRequest>;
  createProperty(user: AuthUser, property: Omit<Property, 'id' | 'issuesCount' | 'dues' | 'status'>): Promise<Property>;
  createUnit(user: AuthUser, propertyId: string, unit: Unit): Promise<Unit>;
  updateUnit(user: AuthUser, propertyId: string, unit: Unit): Promise<Unit>;
  createExpense(user: AuthUser, propertyId: string, expense: Expense, file?: File): Promise<Expense>;
  updateExpense(user: AuthUser, expense: Expense, file?: File): Promise<Expense>;
  deleteExpense(user: AuthUser, expenseId: string): Promise<void>;
  getExpenseDownloadUrl(user: AuthUser, expenseId: string): Promise<string>;
  updateExpenseStatus(user: AuthUser, expenseId: string, status: Expense['status']): Promise<Expense>;
  updateRule(user: AuthUser, propertyId: string, rule: DistributionRule): Promise<DistributionRule>;
  createIssue(user: AuthUser, propertyId: string, issue: Issue): Promise<Issue>;
  updateIssue(user: AuthUser, issueId: string, patch: Partial<Issue>): Promise<Issue>;
  resolveIssueWithExpense(user: AuthUser, issueId: string): Promise<{ issue: Issue; expense?: Expense }>;
  reconcileBankPayment(user: AuthUser, transactionId: string, unitId: string, amount: number): Promise<PaymentLedger>;
  createCashPayment(user: AuthUser, propertyId: string, unitId: string, amount: number, payer: string): Promise<PaymentLedger>;
  createDocument(user: AuthUser, propertyId: string, document: Document, file: File): Promise<Document>;
  getDocumentDownloadUrl(user: AuthUser, documentId: string): Promise<string>;
  deleteDocument(user: AuthUser, documentId: string): Promise<void>;
  publishStatements(user: AuthUser, propertyId: string, period: string): Promise<void>;
  createStatementBatch(user: AuthUser, batch: StatementBatch): Promise<StatementBatch>;
  saveAccountNotices(user: AuthUser, notices: AccountNotice[]): Promise<AccountNotice[]>;
  createCalendarEvent(user: AuthUser, event: CalendarEvent): Promise<CalendarEvent>;
  deleteCalendarEvent(user: AuthUser, eventId: string): Promise<void>;
}

export type DataMode = 'local-demo' | 'supabase';

export function getConfiguredDataMode(): DataMode {
  const mode = import.meta.env.VITE_DATA_MODE;
  return mode === 'supabase' ? 'supabase' : 'local-demo';
}

let _authRepo: AuthRepository | null = null;
let _dataRepo: TenantDataRepository | null = null;

export async function getAuthRepository(): Promise<AuthRepository> {
  if (!_authRepo) {
    const { supabaseAuthRepository } = await import('./supabase/authRepository');
    _authRepo = supabaseAuthRepository;
  }
  return _authRepo;
}

export async function getDataRepository(): Promise<TenantDataRepository> {
  if (!_dataRepo) {
    const { supabaseDataRepository } = await import('./supabase/dataRepository');
    _dataRepo = supabaseDataRepository;
  }
  return _dataRepo;
}
