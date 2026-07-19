import { TenantDataRepository, TenantSnapshot } from '../backendContracts';
import { AuthUser } from '../auth';
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
  Unit,
} from '../../types';
import { buildStatements } from '../propertyStatementAdapter';
import { supabase } from './client';

const ALLOWED_UPLOAD_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
function safeFileName(name: string): string { return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'file'; }
async function uploadPrivateFile(bucket: 'tenant-documents' | 'tenant-branding', tenantId: string, propertyId: string, file: File): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type) || file.size <= 0 || file.size > 15 * 1024 * 1024) throw new Error('Unsupported file type or size');
  const path = `${tenantId}/${propertyId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch('/api/files/scan', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) },
    body: JSON.stringify({ bucket, path }),
  });
  if (!response.ok) {
    await supabase.storage.from(bucket).remove([path]);
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || 'File security scan failed');
  }
  return path;
}

// ── Row → Frontend mappers ────────────────────────────────────────────────────

function mapProperty(row: any, unitsData: any[], issuesData: any[]): Property {
  const unitsCount = unitsData.filter((u) => u.property_id === row.id).length;
  const issuesCount = issuesData.filter(
    (i) => i.property_id === row.id && i.status !== 'Resolved'
  ).length;
  const dues = unitsData
    .filter((u) => u.property_id === row.id && (u.balance ?? 0) > 0)
    .reduce((sum: number, u: any) => sum + Number(u.balance ?? 0), 0);

  return {
    id: row.code,
    tenantId: row.tenant_id,
    name: row.name,
    address: row.address,
    period: row.period,
    status: row.status,
    dues,
    imageUrl: row.image_url ?? '',
    occupancy: Number(row.occupancy ?? 0),
    reserveFund: Number(row.reserve_fund ?? 0),
    cashAvailable: Number(row.cash_available ?? 0),
    unitsCount,
    issuesCount,
  };
}

function mapUnit(row: any, propCodeMap: Map<string, string>): Unit {
  return {
    id: row.code,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    floor: row.floor,
    type: row.type,
    size: Number(row.size ?? 0),
    share: Number(row.share ?? 0),
    coefficient: Number(row.coefficient ?? 0),
    ownerName: row.owner_name ?? '',
    ownerPhone: row.owner_phone ?? undefined,
    ownerEmail: row.owner_email ?? undefined,
    residentName: row.resident_name ?? '',
    residentType: row.resident_type,
    occupants: Number(row.occupants ?? (row.resident_type === 'Κενό' ? 0 : 1)),
    participationStart: row.participation_start ?? undefined,
    participationEnd: row.participation_end ?? undefined,
    participationPolicy: row.participation_policy ?? 'full',
    status: row.status,
    balance: Number(row.balance ?? 0),
    prevBalance: Number(row.prev_balance ?? 0),
    deposit: Number(row.deposit ?? 0),
  };
}

function mapExpense(row: any, propCodeMap: Map<string, string>): Expense {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    date: row.expense_date,
    supplier: row.supplier,
    category: row.category,
    amount: Number(row.amount),
    fileName: row.file_name ?? undefined,
    storagePath: row.storage_path ?? undefined,
    status: row.status,
  };
}

function mapRule(row: any, propCodeMap: Map<string, string>): DistributionRule {
  return {
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    category: row.category,
    method: row.method,
    sampleAmount: Number(row.sample_amount ?? 0),
    description: row.description ?? '',
  };
}

function mapIssue(row: any, propCodeMap: Map<string, string>, propNameMap: Map<string, string>, unitCodeMap: Map<string, string>): Issue {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    unitId: row.unit_id ? unitCodeMap.get(row.unit_id) : undefined,
    title: row.title,
    property: propNameMap.get(row.property_id) ?? '',
    severity: row.severity,
    status: row.status,
    reportedAt: row.reported_at,
    estimate: row.estimate ? Number(row.estimate) : undefined,
    technician: row.technician ?? undefined,
    technicianImg: row.technician_img ?? undefined,
    progress: row.progress ?? undefined,
    invoiceNum: row.invoice_num ?? undefined,
  };
}

function mapBankTx(row: any, propCodeMap: Map<string, string>, unitCodeMap: Map<string, string>): BankTransaction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    date: row.transaction_date,
    amount: Number(row.amount),
    bank: row.bank,
    ref: row.reference,
    description: row.description ?? '',
    suggestedUnit: row.suggested_unit_id ? unitCodeMap.get(row.suggested_unit_id) : undefined,
    suggestedOwner: row.suggested_owner ?? undefined,
  };
}

function mapLedger(row: any, propCodeMap: Map<string, string>, unitCodeMap: Map<string, string>): PaymentLedger {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    period: row.period ?? undefined,
    date: row.paid_at,
    payer: row.payer,
    unit: row.unit_id ? (unitCodeMap.get(row.unit_id) ?? '') : '',
    paymentCode: row.payment_code,
    amount: Number(row.amount),
    method: row.method,
    matchType: row.match_type,
    status: row.status,
  };
}

function mapDocument(row: any, propCodeMap: Map<string, string>, propNameMap: Map<string, string>): Document {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    name: row.name,
    date: row.document_date,
    type: row.type,
    property: propNameMap.get(row.property_id) ?? '',
    visibility: row.visibility,
    size: row.size ?? '',
    storagePath: row.storage_path ?? undefined,
  };
}

function mapProfile(row: any): AuthUser {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    companyName: '',
    avatarUrl: row.avatar_url ?? '',
    phone: row.phone ?? undefined,
    jobTitle: row.job_title ?? undefined,
    status: row.status,
    notificationEmail: row.notification_email ?? undefined,
    notificationSms: row.notification_sms ?? undefined,
  };
}

function mapTenantRequest(row: any): TenantRegistrationRequest {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone ?? '',
    city: row.city ?? '',
    propertiesEstimate: row.properties_estimate ?? 0,
    status: row.status,
  };
}

function mapAccountNotice(row: any, propCodeMap: Map<string, string>, unitCodeMap: Map<string, string>): AccountNotice {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    unitId: unitCodeMap.get(row.unit_id) ?? row.unit_id,
    period: row.period,
    recipient: row.recipient,
    amount: Number(row.amount),
    dueDate: row.due_date,
    channel: row.channel,
    status: row.status,
    sentAt: row.sent_at ?? undefined,
  };
}

function mapCalendarEvent(row: any, propCodeMap: Map<string, string>): CalendarEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id ? (propCodeMap.get(row.property_id) ?? row.property_id) : undefined,
    title: row.title,
    date: row.event_date,
    type: row.event_type,
    notes: row.notes ?? undefined,
  };
}

function mapStatementBatch(row: any, propCodeMap: Map<string, string>): StatementBatch {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: propCodeMap.get(row.property_id) ?? row.property_id,
    period: row.period,
    sequence: row.sequence,
    kind: row.kind,
    reason: row.reason ?? undefined,
    expenseIds: row.expense_ids ?? [],
    unitCharges: row.unit_charges ?? {},
    idempotencyKey: row.idempotency_key ?? undefined,
    unitSnapshot: row.unit_snapshot ?? [],
    ruleSnapshot: row.rule_snapshot ?? [],
    expenseSnapshot: row.expense_snapshot ?? [],
    createdAt: row.created_at,
  };
}

// ── Helper: resolve property UUID from code ───────────────────────────────────

async function resolvePropertyUuid(code: string): Promise<string> {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('code', code)
    .single();
  if (!data) throw new Error(`Property not found: ${code}`);
  return data.id as string;
}

async function resolveUnitUuid(code: string): Promise<string> {
  const { data } = await supabase
    .from('units')
    .select('id')
    .eq('code', code)
    .single();
  if (!data) throw new Error(`Unit not found: ${code}`);
  return data.id as string;
}

// ── Tenant scoping ────────────────────────────────────────────────────────────

/**
 * Defense-in-depth: never rely on Postgres RLS as the *only* authorization
 * layer. Every read/write is also explicitly scoped to the caller's tenant here
 * in the repository, so a misconfigured or disabled policy can't silently leak
 * or cross-write another tenant's data. Platform admins are the sole exception
 * (they operate across tenants) and must reach data through an admin path.
 */
function scopeToTenant<T>(query: T, user: AuthUser): T {
  if (user.role === 'platform_admin') return query;
  // Cast to call `.eq` without pulling Supabase's deeply-nested builder generics
  // into inference (which trips TS2589). The builder returns its own type, so
  // the scoped query keeps the same shape as the input.
  return (query as unknown as { eq: (column: string, value: string) => T }).eq('tenant_id', user.tenantId);
}

// ── Repository implementation ─────────────────────────────────────────────────

export const supabaseDataRepository: TenantDataRepository = {
  async loadSnapshot(user: AuthUser): Promise<TenantSnapshot> {
    const [
      { data: propsRaw },
      { data: unitsRaw },
      { data: expensesRaw },
      { data: rulesRaw },
      { data: issuesRaw },
      { data: bankRaw },
      { data: ledgerRaw },
      { data: docsRaw },
      { data: usersRaw },
      { data: requestsRaw },
      { data: tenantRaw },
      { data: noticesRaw },
      { data: calendarRaw },
      { data: propertyAccessRaw },
      { data: statementBatchesRaw },
    ] = await Promise.all([
      scopeToTenant(supabase.from('properties').select('*'), user),
      scopeToTenant(supabase.from('units').select('*'), user),
      scopeToTenant(supabase.from('expenses').select('*'), user),
      scopeToTenant(supabase.from('distribution_rules').select('*'), user),
      scopeToTenant(supabase.from('issues').select('*'), user),
      scopeToTenant(supabase.from('bank_transactions').select('*'), user).is('reconciled_at', null),
      scopeToTenant(supabase.from('payment_ledger').select('*'), user),
      scopeToTenant(supabase.from('documents').select('*'), user),
      scopeToTenant(supabase.from('user_profiles').select('*'), user),
      supabase.from('tenant_registration_requests').select('*'),
      supabase.from('tenants').select('name, logo_url, logo_storage_path').eq('id', user.tenantId).maybeSingle(),
      scopeToTenant(supabase.from('account_notices').select('*'), user),
      scopeToTenant(supabase.from('calendar_events').select('*'), user),
      supabase.from('user_property_access').select('user_profile_id, properties(code)'),
      scopeToTenant(supabase.from('statement_batches').select('*'), user),
    ]);

    const propUuidToCode = new Map((propsRaw ?? []).map((p: any) => [p.id, p.code as string]));
    const propUuidToName = new Map((propsRaw ?? []).map((p: any) => [p.id, p.name as string]));
    const unitUuidToCode = new Map((unitsRaw ?? []).map((u: any) => [u.id, u.code as string]));

    const properties = (propsRaw ?? []).map((p: any) => mapProperty(p, unitsRaw ?? [], issuesRaw ?? []));
    const units = (unitsRaw ?? []).map((u: any) => mapUnit(u, propUuidToCode));
    const expenses = (expensesRaw ?? []).map((e: any) => mapExpense(e, propUuidToCode));
    const rules = (rulesRaw ?? []).map((r: any) => mapRule(r, propUuidToCode));
    const issues = (issuesRaw ?? []).map((i: any) => mapIssue(i, propUuidToCode, propUuidToName, unitUuidToCode));
    const bankTransactions = (bankRaw ?? []).map((t: any) => mapBankTx(t, propUuidToCode, unitUuidToCode));
    const paymentLedger = (ledgerRaw ?? []).map((l: any) => mapLedger(l, propUuidToCode, unitUuidToCode));
    const documents = (docsRaw ?? []).map((d: any) => mapDocument(d, propUuidToCode, propUuidToName));
    const propertyIdsByUser = new Map<string, string[]>();
    for (const access of propertyAccessRaw ?? []) {
      const profileId = (access as any).user_profile_id as string;
      const code = (access as any).properties?.code as string | undefined;
      if (code) propertyIdsByUser.set(profileId, [...(propertyIdsByUser.get(profileId) ?? []), code]);
    }
    const users = (usersRaw ?? []).map((row: any) => ({ ...mapProfile(row), propertyIds: propertyIdsByUser.get(row.id) }));
    const tenantRequests = (requestsRaw ?? []).map(mapTenantRequest);
    const accountNotices = (noticesRaw ?? []).map((n: any) => mapAccountNotice(n, propUuidToCode, unitUuidToCode));
    const calendarEvents = (calendarRaw ?? []).map((e: any) => mapCalendarEvent(e, propUuidToCode));
    const statementBatches = (statementBatchesRaw ?? []).map((batch: any) => mapStatementBatch(batch, propUuidToCode));

    let privateLogoUrl: string | undefined;
    if (tenantRaw?.logo_storage_path) {
      const { data } = await supabase.storage.from('tenant-branding').createSignedUrl(tenantRaw.logo_storage_path, 3600);
      privateLogoUrl = data?.signedUrl;
    }
    const tenantBranding = tenantRaw
      ? { organizationName: tenantRaw.name as string, logoUrl: privateLogoUrl ?? tenantRaw.logo_url ?? undefined }
      : undefined;

    return { tenantBranding, properties, units, expenses, rules, issues, bankTransactions, paymentLedger, documents, users, tenantRequests, accountNotices, calendarEvents, statementBatches };
  },

  async createProperty(user: AuthUser, prop: Omit<Property, 'id' | 'issuesCount' | 'dues' | 'status'>): Promise<Property> {
    const code = `PRP-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase
      .from('properties')
      .insert({
        tenant_id: user.tenantId,
        code,
        name: prop.name,
        address: prop.address,
        period: prop.period,
        status: 'Draft',
        dues: 0,
        image_url: prop.imageUrl ?? '',
        occupancy: prop.occupancy ?? 0,
        reserve_fund: prop.reserveFund ?? 0,
        cash_available: prop.cashAvailable ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return mapProperty(data, [], []);
  },

  async createUnit(user: AuthUser, propertyCode: string, unit: Unit): Promise<Unit> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
    const { data, error } = await supabase
      .from('units')
      .insert({
        tenant_id: user.tenantId,
        property_id: propertyUuid,
        code: unit.id,
        floor: unit.floor,
        type: unit.type,
        size: unit.size,
        share: unit.share,
        coefficient: unit.coefficient,
        owner_name: unit.ownerName,
        owner_phone: unit.ownerPhone,
        owner_email: unit.ownerEmail,
        resident_name: unit.residentName,
        resident_type: unit.residentType,
        occupants: unit.residentType === 'Κενό' ? 0 : Math.max(1, Math.floor(unit.occupants ?? 1)),
        participation_start: unit.participationStart || null,
        participation_end: unit.participationEnd || null,
        participation_policy: unit.participationPolicy ?? 'full',
        status: unit.status,
        balance: 0,
        prev_balance: 0,
        deposit: unit.deposit,
      })
      .select()
      .single();
    if (error) throw error;
    return mapUnit(data, new Map([[data.property_id, propertyCode]]));
  },

  async updateUnit(_user: AuthUser, propertyCode: string, unit: Unit): Promise<Unit> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
    const { data, error } = await supabase
      .from('units')
      .update({
        floor: unit.floor,
        type: unit.type,
        size: unit.size,
        share: unit.share,
        coefficient: unit.coefficient,
        owner_name: unit.ownerName,
        owner_phone: unit.ownerPhone,
        owner_email: unit.ownerEmail,
        resident_name: unit.residentName,
        resident_type: unit.residentType,
        occupants: unit.residentType === 'Κενό' ? 0 : Math.max(1, Math.floor(unit.occupants ?? 1)),
        participation_start: unit.participationStart || null,
        participation_end: unit.participationEnd || null,
        participation_policy: unit.participationPolicy ?? 'full',
        status: unit.status,
        deposit: unit.deposit,
      })
      .eq('property_id', propertyUuid)
      .eq('code', unit.id)
      .select()
      .single();
    if (error) throw error;
    return mapUnit(data, new Map([[data.property_id, propertyCode]]));
  },

  async createExpense(user: AuthUser, propertyCode: string, expense: Expense, file?: File): Promise<Expense> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
    const storagePath = file ? await uploadPrivateFile('tenant-documents', user.tenantId, propertyUuid, file) : undefined;
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        tenant_id: user.tenantId,
        property_id: propertyUuid,
        expense_date: expense.date,
        supplier: expense.supplier,
        category: expense.category,
        amount: expense.amount,
        file_name: expense.fileName,
        storage_path: storagePath,
        status: expense.status ?? 'Draft',
      })
      .select()
      .single();
    if (error) {
      if (storagePath) await supabase.storage.from('tenant-documents').remove([storagePath]);
      throw error;
    }
    return mapExpense(data, new Map([[data.property_id, propertyCode]]));
  },

  async updateExpense(user: AuthUser, expense: Expense, file?: File): Promise<Expense> {
    const { data: current } = await scopeToTenant(supabase.from('expenses').select('property_id,storage_path'), user).eq('id', expense.id).single();
    if (!current) throw new Error('Expense not found');
    const storagePath = file ? await uploadPrivateFile('tenant-documents', user.tenantId, current.property_id, file) : current.storage_path;
    const { data, error } = await scopeToTenant(supabase.from('expenses').update({
      expense_date: expense.date,
      supplier: expense.supplier,
      category: expense.category,
      amount: expense.amount,
      file_name: expense.fileName ?? null,
      storage_path: storagePath ?? null,
      status: 'Draft',
    }), user)
      .eq('id', expense.id)
      .eq('status', 'Draft')
      .select('*, properties(code)')
      .single();
    if (error) {
      if (file && storagePath) await supabase.storage.from('tenant-documents').remove([storagePath]);
      throw error;
    }
    if (file && current.storage_path && current.storage_path !== storagePath) await supabase.storage.from('tenant-documents').remove([current.storage_path]);
    const propCode = (data as any).properties?.code ?? expense.propertyId ?? '';
    return mapExpense(data, new Map([[data.property_id, propCode]]));
  },

  async deleteExpense(user: AuthUser, expenseId: string): Promise<void> {
    const { data: current } = await scopeToTenant(supabase.from('expenses').select('storage_path'), user).eq('id', expenseId).maybeSingle();
    const { error } = await scopeToTenant(supabase.from('expenses').delete(), user).eq('id', expenseId);
    if (error) throw error;
    if (current?.storage_path) await supabase.storage.from('tenant-documents').remove([current.storage_path]);
  },

  async getExpenseDownloadUrl(user: AuthUser, expenseId: string): Promise<string> {
    const { data: expense, error } = await scopeToTenant(supabase.from('expenses').select('storage_path'), user).eq('id', expenseId).single();
    if (error || !expense?.storage_path) throw error ?? new Error('Expense file not found');
    const { data, error: signedError } = await supabase.storage.from('tenant-documents').createSignedUrl(expense.storage_path, 60);
    if (signedError) throw signedError;
    return data.signedUrl;
  },

  async updateExpenseStatus(user: AuthUser, expenseId: string, status: Expense['status']): Promise<Expense> {
    const { data, error } = await scopeToTenant(supabase.from('expenses').update({ status }), user)
      .eq('id', expenseId)
      .select('*, properties(code)')
      .single();
    if (error) throw error;
    const propCode = (data as any).properties?.code ?? '';
    return mapExpense(data, new Map([[data.property_id, propCode]]));
  },

  async updateRule(user: AuthUser, propertyCode: string, rule: DistributionRule): Promise<DistributionRule> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
    const { data, error } = await supabase
      .from('distribution_rules')
      .upsert({
        tenant_id: user.tenantId,
        property_id: propertyUuid,
        category: rule.category,
        method: rule.method,
        sample_amount: rule.sampleAmount,
        description: rule.description,
      }, { onConflict: 'property_id,category' })
      .select()
      .single();
    if (error) throw error;
    return mapRule(data, new Map([[data.property_id, propertyCode]]));
  },

  async createIssue(user: AuthUser, propertyCode: string, issue: Issue): Promise<Issue> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
    let unitUuid: string | null = null;
    if (issue.unitId) {
      unitUuid = await resolveUnitUuid(issue.unitId).catch(() => null);
    }
    const { data, error } = await supabase
      .from('issues')
      .insert({
        tenant_id: user.tenantId,
        property_id: propertyUuid,
        unit_id: unitUuid,
        title: issue.title,
        severity: issue.severity,
        status: issue.status ?? 'New',
        reported_at: issue.reportedAt,
        estimate: issue.estimate,
        technician: issue.technician,
        technician_img: issue.technicianImg,
        progress: issue.progress,
        invoice_num: issue.invoiceNum,
      })
      .select()
      .single();
    if (error) throw error;
    return mapIssue(data, new Map([[data.property_id, propertyCode]]), new Map([[data.property_id, issue.property]]), new Map());
  },

  async updateIssue(_user: AuthUser, issueId: string, patch: Partial<Issue>): Promise<Issue> {
    const updatePayload: Record<string, unknown> = {};
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.technician !== undefined) updatePayload.technician = patch.technician;
    if (patch.technicianImg !== undefined) updatePayload.technician_img = patch.technicianImg;
    if (patch.estimate !== undefined) updatePayload.estimate = patch.estimate;
    if (patch.progress !== undefined) updatePayload.progress = patch.progress;
    if (patch.invoiceNum !== undefined) updatePayload.invoice_num = patch.invoiceNum;

    const { data, error } = await supabase
      .from('issues')
      .update(updatePayload)
      .eq('id', issueId)
      .select()
      .single();
    if (error) throw error;
    return mapIssue(data, new Map(), new Map(), new Map());
  },

  async resolveIssueWithExpense(_user: AuthUser, issueId: string): Promise<{ issue: Issue; expense?: Expense }> {
    const { data, error } = await supabase.rpc('resolve_issue_with_expense', { target_issue_id: issueId });
    if (error) throw error;
    const payload = data as { issue: any; expense?: any };
    const propertyUuid = payload.issue.property_id;
    const { data: property } = await supabase.from('properties').select('code,name').eq('id', propertyUuid).single();
    const propCodeMap = new Map([[propertyUuid, property?.code ?? propertyUuid]]);
    return {
      issue: mapIssue(payload.issue, propCodeMap, new Map([[propertyUuid, property?.name ?? '']]), new Map()),
      expense: payload.expense ? mapExpense(payload.expense, propCodeMap) : undefined,
    };
  },

  async reconcileBankPayment(_user: AuthUser, transactionId: string, unitId: string, amount: number): Promise<PaymentLedger> {
    const { data: txData, error: txError } = await scopeToTenant(supabase
      .from('bank_transactions')
      .select('property_id, properties(code), suggested_owner'), _user)
      .eq('id', transactionId)
      .single();
    if (txError || !txData) throw txError ?? new Error('Bank transaction not found');
    const propertyCode = (txData as any).properties?.code ?? '';
    const { data, error } = await supabase.rpc('post_property_payment', {
      target_property_code: propertyCode,
      target_unit_code: unitId,
      payment_amount: amount,
      payment_payer: (txData as any).suggested_owner || _user.fullName,
      payment_method: 'Τράπεζα',
      payment_reference: `BNK-${transactionId.slice(0, 6).toUpperCase()}`,
      source_bank_transaction_id: transactionId,
    });
    if (error) throw error;
    return mapLedger(data, new Map([[data.property_id, propertyCode]]), new Map([[data.unit_id, unitId]]));
  },

  async createCashPayment(user: AuthUser, propertyCode: string, unitId: string, amount: number, payer: string): Promise<PaymentLedger> {
    const { data, error } = await supabase.rpc('post_property_payment', {
      target_property_code: propertyCode,
      target_unit_code: unitId,
      payment_amount: amount,
      payment_payer: payer,
      payment_method: 'Μετρητά',
      payment_reference: `CSH-${Math.floor(1000 + Math.random() * 9000)}`,
      source_bank_transaction_id: null,
    });
    if (error) throw error;
    return mapLedger(data, new Map([[data.property_id, propertyCode]]), new Map([[data.unit_id, unitId]]));
  },

  async createDocument(user: AuthUser, propertyCode: string, doc: Document, file: File): Promise<Document> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
    const storagePath = await uploadPrivateFile('tenant-documents', user.tenantId, propertyUuid, file);
    const { data, error } = await supabase
      .from('documents')
      .insert({
        tenant_id: user.tenantId,
        property_id: propertyUuid,
        name: doc.name,
        document_date: doc.date,
        type: doc.type,
        visibility: doc.visibility,
        size: doc.size,
        storage_path: storagePath,
      })
      .select()
      .single();
    if (error) { await supabase.storage.from('tenant-documents').remove([storagePath]); throw error; }
    return mapDocument(data, new Map([[propertyUuid, propertyCode]]), new Map([[propertyUuid, doc.property]]));
  },

  async deleteDocument(user: AuthUser, documentId: string): Promise<void> {
    const { data: current } = await scopeToTenant(supabase.from('documents').select('storage_path'), user).eq('id', documentId).maybeSingle();
    const { error } = await scopeToTenant(supabase.from('documents').delete(), user).eq('id', documentId);
    if (error) throw error;
    if (current?.storage_path) await supabase.storage.from('tenant-documents').remove([current.storage_path]);
  },

  async getDocumentDownloadUrl(user: AuthUser, documentId: string): Promise<string> {
    const { data: doc, error } = await scopeToTenant(supabase.from('documents').select('storage_path'), user).eq('id', documentId).single();
    if (error || !doc?.storage_path) throw error ?? new Error('Document file not found');
    const { data, error: signedError } = await supabase.storage.from('tenant-documents').createSignedUrl(doc.storage_path, 60);
    if (signedError) throw signedError;
    return data.signedUrl;
  },

  async publishStatements(user: AuthUser, propertyCode: string, period: string): Promise<void> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);

    const [{ data: unitsRaw }, { data: expensesRaw }, { data: rulesRaw }] = await Promise.all([
      supabase.from('units').select('*').eq('property_id', propertyUuid),
      supabase.from('expenses').select('*').eq('property_id', propertyUuid).eq('status', 'Verified'),
      supabase.from('distribution_rules').select('*').eq('property_id', propertyUuid),
    ]);

    const propCodeMap = new Map([[propertyUuid, propertyCode]]);
    const units = (unitsRaw ?? []).map((u: any) => mapUnit(u, propCodeMap));
    const expenses = (expensesRaw ?? []).map((e: any) => mapExpense(e, propCodeMap));
    const rules = (rulesRaw ?? []).map((r: any) => mapRule(r, propCodeMap));

    const statements = buildStatements({ period, units, expenses, rules });

    for (const stmt of statements) {
      const unitUuid = await resolveUnitUuid(stmt.unitCode).catch(() => null);
      if (!unitUuid) continue;

      const { data: existingStatement } = await supabase.from('statements').select('id,status')
        .eq('unit_id', unitUuid).eq('period', period).maybeSingle();
      if (existingStatement?.status === 'published') continue;

      const { data: statRow } = await supabase
        .from('statements')
        .upsert({
          tenant_id: user.tenantId,
          property_id: propertyUuid,
          unit_id: unitUuid,
          period,
          previous_balance: stmt.previousBalance,
          current_charges: stmt.currentCharges,
          total_due: stmt.totalDue,
          status: 'published',
          published_at: new Date().toISOString(),
        }, { onConflict: 'unit_id,period' })
        .select()
        .single();

      if (statRow) {
        const lines = stmt.lines.map((line) => ({
          statement_id: statRow.id,
          category: line.categoryCode,
          building_total: line.amount,
          unit_amount: line.amount,
          responsible_party: line.responsibleParty,
        }));
        if (lines.length > 0) {
          await supabase.from('statement_lines').upsert(lines, { onConflict: 'statement_id,category' });
        }
      }
    }

    await supabase
      .from('properties')
      .update({ status: 'Published' })
      .eq('id', propertyUuid);
  },

  async createStatementBatch(user: AuthUser, batch: StatementBatch): Promise<StatementBatch> {
    const propertyUuid = await resolvePropertyUuid(batch.propertyId);
    const row = {
      tenant_id: user.tenantId,
      property_id: propertyUuid,
      period: batch.period,
      sequence: batch.sequence,
      kind: batch.kind,
      reason: batch.reason ?? null,
      expense_ids: batch.expenseIds,
      unit_charges: batch.unitCharges,
      idempotency_key: batch.idempotencyKey ?? `${user.tenantId}:${batch.propertyId}:${batch.period}:${batch.kind}:${batch.sequence}`,
      issued_by: user.id,
      unit_snapshot: batch.unitSnapshot ?? [],
      rule_snapshot: batch.ruleSnapshot ?? [],
      expense_snapshot: batch.expenseSnapshot ?? [],
    };
    const { data, error } = await supabase.from('statement_batches').insert(row).select().single();
    if (error?.code === '23505') {
      const { data: existing, error: existingError } = await supabase.from('statement_batches').select('*')
        .eq('tenant_id', user.tenantId).eq('idempotency_key', row.idempotency_key).single();
      if (existingError) throw existingError;
      return mapStatementBatch(existing, new Map([[propertyUuid, batch.propertyId]]));
    }
    if (error) throw error;
    await supabase.from('audit_events').insert({
      tenant_id: user.tenantId, actor_profile_id: user.id, action: `statement.${batch.kind}`,
      resource_type: 'statement_batch', resource_id: data.id, property_id: propertyUuid,
      after_data: data, metadata: { period: batch.period, sequence: batch.sequence },
    });
    return mapStatementBatch(data, new Map([[propertyUuid, batch.propertyId]]));
  },

  async saveAccountNotices(user: AuthUser, notices: AccountNotice[]): Promise<AccountNotice[]> {
    const saved: AccountNotice[] = [];
    for (const notice of notices) {
      const [propertyUuid, unitUuid] = await Promise.all([
        resolvePropertyUuid(notice.propertyId),
        resolveUnitUuid(notice.unitId),
      ]);
      const { data, error } = await supabase.from('account_notices').upsert({
        tenant_id: user.tenantId,
        property_id: propertyUuid,
        unit_id: unitUuid,
        period: notice.period,
        recipient: notice.recipient,
        amount: notice.amount,
        due_date: notice.dueDate,
        channel: notice.channel,
        status: 'draft',
        sent_at: null,
        statement_batch_id: notice.statementBatchId ?? null,
      }, { onConflict: 'unit_id,period' }).select().single();
      if (error) throw error;
      await supabase.from('calendar_events').upsert({
        tenant_id: user.tenantId, property_id: propertyUuid,
        title: `Λήξη ειδοποιητηρίου ${notice.unitId} · ${notice.amount.toLocaleString('el-GR')} €`,
        event_date: notice.dueDate, event_type: 'deadline',
        notes: `${notice.period} · Παραλήπτης: ${notice.recipient}`,
        created_by: user.id, source_key: `notice:${data.id}`,
      }, { onConflict: 'tenant_id,source_key' });
      saved.push(mapAccountNotice(data, new Map([[propertyUuid, notice.propertyId]]), new Map([[unitUuid, notice.unitId]])));
    }
    return saved;
  },

  async createCalendarEvent(user: AuthUser, event: CalendarEvent): Promise<CalendarEvent> {
    const propertyUuid = event.propertyId ? await resolvePropertyUuid(event.propertyId) : null;
    const { data, error } = await supabase.from('calendar_events').insert({
      tenant_id: user.tenantId,
      property_id: propertyUuid,
      title: event.title,
      event_date: event.date,
      event_type: event.type,
      notes: event.notes ?? null,
      created_by: user.id,
    }).select().single();
    if (error) throw error;
    return mapCalendarEvent(data, propertyUuid && event.propertyId ? new Map([[propertyUuid, event.propertyId]]) : new Map());
  },

  async deleteCalendarEvent(user: AuthUser, eventId: string): Promise<void> {
    const { error } = await scopeToTenant(supabase.from('calendar_events').delete(), user).eq('id', eventId);
    if (error) throw error;
  },

  async inviteUser(actor: AuthUser, user: AuthUser): Promise<AuthUser> {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', actor.tenantId)
      .single();

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        tenant_id: tenantRow?.id ?? actor.tenantId,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        status: 'invited',
        avatar_url: '',
      })
      .select()
      .single();
    if (error) throw error;
    return mapProfile(data);
  },

  async updateUser(actor: AuthUser, user: AuthUser): Promise<AuthUser> {
    // Scope to the actor's tenant so a user can't be moved/edited across tenants.
    const { data, error } = await supabase.rpc('admin_update_user', {
      target_profile_id: user.id, target_full_name: user.fullName, target_role: user.role,
      target_phone: user.phone ?? null, target_job_title: user.jobTitle ?? null, target_status: user.status,
      target_notification_email: user.notificationEmail ?? true, target_notification_sms: user.notificationSms ?? false,
    });
    if (error) throw error;
    if (user.role === 'company_staff') {
      const { error: deleteError } = await supabase.from('user_property_access').delete().eq('user_profile_id', user.id);
      if (deleteError) throw deleteError;
      if (user.propertyIds?.length) {
        const { data: propertyRows, error: propertiesError } = await scopeToTenant(
          supabase.from('properties').select('id, code'), actor
        ).in('code', user.propertyIds);
        if (propertiesError) throw propertiesError;
        const { error: insertError } = await supabase.from('user_property_access').insert(
          (propertyRows ?? []).map((property: any) => ({ user_profile_id: user.id, property_id: property.id }))
        );
        if (insertError) throw insertError;
      }
    }
    return { ...mapProfile(data), propertyIds: user.propertyIds };
  },

  async updateOwnProfile(user: AuthUser): Promise<AuthUser> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: user.fullName,
        phone: user.phone,
        job_title: user.jobTitle,
        avatar_url: user.avatarUrl,
        notification_email: user.notificationEmail,
        notification_sms: user.notificationSms,
      })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return mapProfile(data);
  },

  async updateTenantBranding(user: AuthUser, branding: { organizationName: string; logoUrl?: string }): Promise<void> {
    if (user.role !== 'company_admin') throw new Error('Only company administrators can update tenant branding.');
    const { data: current } = await supabase.from('tenants').select('logo_storage_path').eq('id', user.tenantId).single();
    let storagePath: string | null = current?.logo_storage_path ?? null;
    let externalUrl: string | null = branding.logoUrl ?? null;
    if (branding.logoUrl?.startsWith('data:')) {
      const blob = await (await fetch(branding.logoUrl)).blob();
      if (blob.size > 2 * 1024 * 1024) throw new Error('Το λογότυπο πρέπει να είναι έως 2 MB.');
      const extension = blob.type === 'image/svg+xml' ? 'svg' : blob.type.split('/')[1] || 'png';
      const file = new File([blob], `workspace-logo.${extension}`, { type: blob.type });
      storagePath = await uploadPrivateFile('tenant-branding', user.tenantId, 'workspace', file);
      externalUrl = null;
    } else if (!branding.logoUrl) storagePath = null;
    const { error } = await supabase
      .from('tenants')
      .update({ name: branding.organizationName, logo_url: externalUrl, logo_storage_path: storagePath })
      .eq('id', user.tenantId);
    if (error) throw error;
    if (current?.logo_storage_path && current.logo_storage_path !== storagePath) await supabase.storage.from('tenant-branding').remove([current.logo_storage_path]);
  },

  async approveTenantRequest(_actor: AuthUser, requestId: string): Promise<TenantRegistrationRequest> {
    const { data, error } = await supabase
      .from('tenant_registration_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw error;
    return mapTenantRequest(data);
  },
};
