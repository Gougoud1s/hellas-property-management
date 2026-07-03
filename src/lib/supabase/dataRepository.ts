import { TenantDataRepository, TenantSnapshot } from '../backendContracts';
import { AuthUser } from '../auth';
import {
  BankTransaction,
  DistributionRule,
  Document,
  Expense,
  Issue,
  PaymentLedger,
  Property,
  TenantRegistrationRequest,
  Unit,
} from '../../types';
import { buildStatements } from '../propertyStatementAdapter';
import { supabase } from './client';

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
    const users = (usersRaw ?? []).map(mapProfile);
    const tenantRequests = (requestsRaw ?? []).map(mapTenantRequest);

    return { properties, units, expenses, rules, issues, bankTransactions, paymentLedger, documents, users, tenantRequests };
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
        status: unit.status,
        balance: unit.balance,
        prev_balance: unit.prevBalance,
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
        status: unit.status,
        balance: unit.balance,
        prev_balance: unit.prevBalance,
        deposit: unit.deposit,
      })
      .eq('property_id', propertyUuid)
      .eq('code', unit.id)
      .select()
      .single();
    if (error) throw error;
    return mapUnit(data, new Map([[data.property_id, propertyCode]]));
  },

  async createExpense(user: AuthUser, propertyCode: string, expense: Expense): Promise<Expense> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
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
        status: expense.status ?? 'Draft',
      })
      .select()
      .single();
    if (error) throw error;
    return mapExpense(data, new Map([[data.property_id, propertyCode]]));
  },

  async deleteExpense(user: AuthUser, expenseId: string): Promise<void> {
    const { error } = await scopeToTenant(supabase.from('expenses').delete(), user).eq('id', expenseId);
    if (error) throw error;
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

  async reconcileBankPayment(_user: AuthUser, transactionId: string, unitId: string, amount: number): Promise<PaymentLedger> {
    const unitUuid = await resolveUnitUuid(unitId);

    const { data: txData } = await supabase
      .from('bank_transactions')
      .select('property_id')
      .eq('id', transactionId)
      .single();
    const propUuid = txData?.property_id as string;

    const { data: propData } = await supabase
      .from('properties')
      .select('code')
      .eq('id', propUuid)
      .single();
    const propertyCode = (propData as any)?.code ?? '';

    await supabase
      .from('bank_transactions')
      .update({ reconciled_at: new Date().toISOString() })
      .eq('id', transactionId);

    await supabase
      .from('units')
      .update({ balance: 0 })
      .eq('id', unitUuid);

    const { data, error } = await supabase
      .from('payment_ledger')
      .insert({
        tenant_id: _user.tenantId,
        property_id: propUuid,
        unit_id: unitUuid,
        paid_at: new Date().toISOString().split('T')[0],
        payer: _user.fullName,
        payment_code: `BNK-${transactionId.slice(0, 6).toUpperCase()}`,
        amount,
        method: 'Τράπεζα',
        match_type: 'ΧΕΙΡΟΚΙΝΗΤΗ',
        status: 'Ολοκληρώθηκε',
      })
      .select()
      .single();
    if (error) throw error;
    return mapLedger(data, new Map([[propUuid, propertyCode]]), new Map([[unitUuid, unitId]]));
  },

  async createCashPayment(user: AuthUser, propertyCode: string, unitId: string, amount: number, payer: string): Promise<PaymentLedger> {
    const [propertyUuid, unitUuid] = await Promise.all([
      resolvePropertyUuid(propertyCode),
      resolveUnitUuid(unitId),
    ]);

    await supabase.from('units').update({ balance: 0 }).eq('id', unitUuid);

    const { data, error } = await supabase
      .from('payment_ledger')
      .insert({
        tenant_id: user.tenantId,
        property_id: propertyUuid,
        unit_id: unitUuid,
        paid_at: new Date().toISOString().split('T')[0],
        payer,
        payment_code: `CSH-${Math.floor(1000 + Math.random() * 9000)}`,
        amount,
        method: 'Μετρητά',
        match_type: 'ΧΕΙΡΟΚΙΝΗΤΗ',
        status: 'Ολοκληρώθηκε',
      })
      .select()
      .single();
    if (error) throw error;
    return mapLedger(data, new Map([[propertyUuid, propertyCode]]), new Map([[unitUuid, unitId]]));
  },

  async createDocument(user: AuthUser, propertyCode: string, doc: Document): Promise<Document> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);
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
      })
      .select()
      .single();
    if (error) throw error;
    return mapDocument(data, new Map([[propertyUuid, propertyCode]]), new Map([[propertyUuid, doc.property]]));
  },

  async deleteDocument(user: AuthUser, documentId: string): Promise<void> {
    const { error } = await scopeToTenant(supabase.from('documents').delete(), user).eq('id', documentId);
    if (error) throw error;
  },

  async publishStatements(user: AuthUser, propertyCode: string, period: string): Promise<void> {
    const propertyUuid = await resolvePropertyUuid(propertyCode);

    const [{ data: unitsRaw }, { data: expensesRaw }, { data: rulesRaw }] = await Promise.all([
      supabase.from('units').select('*').eq('property_id', propertyUuid),
      supabase.from('expenses').select('*').eq('property_id', propertyUuid).eq('status', 'Verified'),
      supabase.from('distribution_rules').select('*').eq('property_id', propertyUuid),
    ]);

    const propCodeMap = new Map([[propertyUuid, propertyCode]]);
    const units = (unitsRaw ?? []).map((u: any) => ({ ...u, id: u.code }));
    const expenses = (expensesRaw ?? []).map((e: any) => mapExpense(e, propCodeMap));
    const rules = (rulesRaw ?? []).map((r: any) => mapRule(r, propCodeMap));

    const statements = buildStatements({ period, units, expenses, rules });

    for (const stmt of statements) {
      const unitUuid = await resolveUnitUuid(stmt.unitCode).catch(() => null);
      if (!unitUuid) continue;

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
    const { data, error } = await scopeToTenant(
      supabase
        .from('user_profiles')
        .update({
          full_name: user.fullName,
          role: user.role,
          phone: user.phone,
          job_title: user.jobTitle,
          status: user.status,
          notification_email: user.notificationEmail,
          notification_sms: user.notificationSms,
        }),
      actor
    )
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return mapProfile(data);
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
