import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Property,
  Unit,
  Expense,
  DistributionRule,
  Issue,
  BankTransaction,
  PaymentLedger,
  Document,
  Tenant,
  TenantSubscription,
  PmSettings,
  TenantRegistrationRequest,
  AccountNotice,
  CalendarEvent,
  StatementBatch,
  getSavedState,
  getSavedSeededArray,
  saveState,
  INITIAL_TENANTS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_PM_SETTINGS,
  INITIAL_PROPERTIES,
  INITIAL_UNITS,
  INITIAL_EXPENSES,
  INITIAL_RULES,
  INITIAL_ISSUES,
  INITIAL_BANK_TRANSACTIONS,
  INITIAL_PAYMENT_LEDGER,
  INITIAL_DOCUMENTS
} from './types';
import {
  AuthUser,
  canAccessTab,
  clearAuthUser,
  canEditUser,
  getDemoTenantUsers,
  getDefaultTabForRole,
  getSavedAuthUser,
  hasPermission,
  saveAuthUser
} from './lib/auth';
import { createPaymentLedgerEntryFromBankMatch } from './lib/paymentLedger';
import { reconcilePropertyDues, reconcileUnitBalances } from './lib/financialBalance';
import { buildStatements, statementCurrentCharges } from './lib/propertyStatementAdapter';
import {
  getConfiguredDataMode,
  getAuthRepository,
  getDataRepository,
} from './lib/backendContracts';
import {
  describeUserScope,
  getPropertyUnits,
  getScopedSelectedProperty,
  getVisibleBankTransactions,
  getVisibleDocuments,
  getVisibleExpenses,
  getVisibleIssues,
  getVisiblePaymentLedger,
  getVisibleProperties,
  getVisibleUnits,
  isCompanyUser
} from './lib/tenantScope';

// Import Modular View Components
import Header from './components/Header';
import Sidebar, { ActiveTab } from './components/Sidebar';
import PropertiesView from './components/PropertiesView';
import UnitsView from './components/UnitsView';
import ExpensesView from './components/ExpensesView';
import RulesView from './components/RulesView';
import StatementsView from './components/StatementsView';
import IssuesView from './components/IssuesView';
import BankLedgerView from './components/BankLedgerView';
import DocumentsView from './components/DocumentsView';
import LoginView from './components/LoginView';
import AdminConsoleView from './components/AdminConsoleView';
import TenantsView from './components/TenantsView';
import UsersView from './components/UsersView';
import SubscriptionsView from './components/SubscriptionsView';
import PmSettingsView from './components/PmSettingsView';
import { platformCan } from './lib/rbac';
import { apiFetch } from './lib/apiClient';
import ProfileSettingsView from './components/ProfileSettingsView';
import InvoicingView from './components/InvoicingView';
import AssemblyView from './components/AssemblyView';
import CalendarView from './components/CalendarView';
import OwnerDashboardView from './components/OwnerDashboardView';
import CompanyDashboardView from './components/CompanyDashboardView';
import GuidedTour, { TOUR_VERSION } from './components/GuidedTour';

const INITIAL_TENANT_REQUESTS: TenantRegistrationRequest[] = [
  {
    id: 'tenant-request-1',
    companyName: 'Athens Blocks ΙΚΕ',
    contactName: 'Σοφία Κωνσταντίνου',
    email: 'sofia@athensblocks.gr',
    phone: '210-5533000',
    city: 'Αθήνα',
    propertiesEstimate: 18,
    status: 'pending'
  }
];

export default function App() {
  const dataMode = getConfiguredDataMode();
  const [isLoading, setIsLoading] = useState(() => dataMode === 'supabase');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    dataMode === 'local-demo' ? getSavedAuthUser() : null
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const savedUser = dataMode === 'local-demo' ? getSavedAuthUser() : null;
    return savedUser ? getDefaultTabForRole(savedUser.role) : 'properties';
  });
  const supabaseInitialized = useRef(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [statementsFocus, setStatementsFocus] = useState<'issuance' | 'notices' | undefined>();

  // Load state or use initial mock databases
  const [properties, setProperties] = useState<Property[]>(() =>
    getSavedSeededArray('hpm_properties', INITIAL_PROPERTIES, (item) => `${item.tenantId}:${item.id}`)
  );
  
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(() => {
    const saved = getSavedState<string | null>('hpm_selected_id', 'ATH-0226');
    const found = INITIAL_PROPERTIES.find((p) => p.id === saved);
    return found || INITIAL_PROPERTIES[0];
  });

  const [units, setUnits] = useState<Unit[]>(() => {
    const loaded = getSavedSeededArray('hpm_units', INITIAL_UNITS, (item) => `${item.tenantId}:${item.propertyId}:${item.id}`);
    if (localStorage.getItem('atlas-migration:anastassiadis-a2-statement-v1') === 'complete') return loaded;
    return loaded.map((unit) => unit.tenantId === 'tenant-anastassiadis' && unit.propertyId === 'ANA-IL-01' && unit.id === 'A2'
      ? { ...unit, balance: 85.22, prevBalance: 0 }
      : unit);
  });

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getSavedSeededArray('hpm_expenses', INITIAL_EXPENSES, (item) => item.id)
  );

  const [rules, setRules] = useState<DistributionRule[]>(() => {
    const loaded = getSavedSeededArray('hpm_rules', INITIAL_RULES, (item) => `${item.tenantId}:${item.propertyId}:${item.category}`);
    const migrationKey = 'atlas-migration:anastassiadis-cleaning-rule-v1';
    if (localStorage.getItem(migrationKey) === 'complete') return loaded;
    const migrated = loaded.map((rule) =>
      rule.tenantId === 'tenant-anastassiadis'
      && rule.propertyId === 'ANA-IL-01'
      && rule.category === 'Καθαριότητα'
        ? { ...rule, method: 'Βάσει Ατόμων' as const, description: 'Κατανομή βάσει του αριθμού ατόμων ανά ενεργό διαμέρισμα.' }
        : rule
    );
    localStorage.setItem(migrationKey, 'complete');
    return migrated;
  });

  const [issues, setIssues] = useState<Issue[]>(() =>
    getSavedSeededArray('hpm_issues', INITIAL_ISSUES, (item) => item.id)
  );

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() =>
    getSavedSeededArray('hpm_bank_tx', INITIAL_BANK_TRANSACTIONS, (item) => item.id)
  );

  const [paymentLedger, setPaymentLedger] = useState<PaymentLedger[]>(() => {
    let loaded = getSavedSeededArray('hpm_payment_ledger', INITIAL_PAYMENT_LEDGER, (item) => item.id);
    if (localStorage.getItem('atlas-migration:anastassiadis-a2-statement-v1') !== 'complete') {
      localStorage.setItem('atlas-migration:anastassiadis-a2-statement-v1', 'complete');
      loaded = loaded.filter((entry) => entry.id !== 'ana-pay-1');
    }
    if (localStorage.getItem('atlas-migration:authoritative-balances-v1') !== 'complete') {
      localStorage.setItem('atlas-migration:authoritative-balances-v1', 'complete');
      loaded = loaded
        .filter((entry) => entry.id !== 'ana-pay-1')
        .map((entry) => entry.id === 'ana-pay-2'
          ? { ...entry, period: 'Ιούλιος 2026', amount: 90.18 }
          : entry.id === 'ana-pay-3' ? { ...entry, period: 'Ιούλιος 2026' } : entry);
    }
    return loaded;
  });

  const [documents, setDocuments] = useState<Document[]>(() =>
    getSavedSeededArray('hpm_documents', INITIAL_DOCUMENTS, (item) => item.id)
  );
  const [accountNotices, setAccountNotices] = useState<AccountNotice[]>(() =>
    getSavedState<AccountNotice[]>('hpm_account_notices', [])
  );
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() =>
    getSavedState<CalendarEvent[]>('hpm_calendar_events', [])
  );
  const [statementBatches, setStatementBatches] = useState<StatementBatch[]>(() =>
    getSavedState<StatementBatch[]>('hpm_statement_batches', [])
  );

  const [tenantUsers, setTenantUsers] = useState<AuthUser[]>(() =>
    getSavedState<AuthUser[]>('hpm_tenant_users', getDemoTenantUsers())
  );

  const [tenantRequests, setTenantRequests] = useState<TenantRegistrationRequest[]>(() =>
    getSavedState<TenantRegistrationRequest[]>('hpm_tenant_requests', INITIAL_TENANT_REQUESTS)
  );

  const [tenants, setTenants] = useState<Tenant[]>(() =>
    getSavedSeededArray('hpm_tenants_v2', INITIAL_TENANTS, (item) => item.id)
  );

  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>(() =>
    getSavedSeededArray('hpm_subscriptions', INITIAL_SUBSCRIPTIONS, (item) => item.id)
  );

  const [pmSettings, setPmSettings] = useState<PmSettings>(() =>
    getSavedState<PmSettings>('hpm_pm_settings', INITIAL_PM_SETTINGS)
  );

  const reconciledUnits = useMemo(() => reconcileUnitBalances({
    properties, units, expenses, rules, statementBatches, payments: paymentLedger,
  }), [expenses, paymentLedger, properties, rules, statementBatches, units]);

  const reconciledProperties = useMemo(
    () => reconcilePropertyDues(properties, reconciledUnits),
    [properties, reconciledUnits]
  );

  const reconciledSelectedProperty = selectedProperty
    ? reconciledProperties.find((property) => property.id === selectedProperty.id && property.tenantId === selectedProperty.tenantId) ?? selectedProperty
    : null;

  const scopedSelectedProperty = useMemo(
    () => (currentUser ? getScopedSelectedProperty(currentUser, reconciledSelectedProperty, reconciledProperties) : reconciledSelectedProperty),
    [currentUser, reconciledProperties, reconciledSelectedProperty]
  );

  const workspaceTenant = currentUser ? tenants.find((tenant) => tenant.id === currentUser.tenantId) : undefined;
  const workspaceBrandName = currentUser?.role === 'platform_admin'
    ? 'Atlas PM'
    : workspaceTenant?.companyName || currentUser?.companyName || pmSettings.organizationName;
  const workspaceLogoUrl = workspaceTenant?.logoUrl || pmSettings.logoUrl;

  const visibleProperties = useMemo(
    () => (currentUser ? getVisibleProperties(currentUser, reconciledProperties) : reconciledProperties),
    [currentUser, reconciledProperties]
  );

  const propertyUnits = useMemo(
    () => (currentUser ? getPropertyUnits(currentUser, reconciledUnits, scopedSelectedProperty) : reconciledUnits),
    [currentUser, reconciledUnits, scopedSelectedProperty]
  );

  const visibleUnits = useMemo(
    () => (currentUser ? getVisibleUnits(currentUser, reconciledUnits, scopedSelectedProperty) : reconciledUnits),
    [currentUser, reconciledUnits, scopedSelectedProperty]
  );

  const statementUnits = currentUser && isCompanyUser(currentUser) ? propertyUnits : visibleUnits;

  const propertyRules = useMemo(
    () => rules.filter((rule) =>
      (!rule.tenantId || rule.tenantId === currentUser?.tenantId)
      && (!rule.propertyId || rule.propertyId === scopedSelectedProperty?.id)
    ),
    [currentUser?.tenantId, rules, scopedSelectedProperty?.id]
  );

  const visibleExpenses = useMemo(
    () => (currentUser ? getVisibleExpenses(currentUser, expenses, scopedSelectedProperty) : expenses),
    [currentUser, expenses, scopedSelectedProperty]
  );

  const visibleIssues = useMemo(
    () => (currentUser ? getVisibleIssues(currentUser, issues, scopedSelectedProperty, properties) : issues),
    [currentUser, issues, properties, scopedSelectedProperty]
  );

  const visibleBankTransactions = useMemo(
    () => (currentUser ? getVisibleBankTransactions(currentUser, bankTransactions, scopedSelectedProperty) : bankTransactions),
    [bankTransactions, currentUser, scopedSelectedProperty]
  );

  const visiblePaymentLedger = useMemo(
    () => (currentUser ? getVisiblePaymentLedger(currentUser, paymentLedger, scopedSelectedProperty) : paymentLedger),
    [currentUser, paymentLedger, scopedSelectedProperty]
  );

  const visibleDocuments = useMemo(
    () => (currentUser ? getVisibleDocuments(currentUser, documents, scopedSelectedProperty, properties) : documents),
    [currentUser, documents, properties, scopedSelectedProperty]
  );

  // Save changes to localStorage on any state modification
  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    saveState('hpm_properties', properties);
  }, [dataMode, properties]);

  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    if (selectedProperty) {
      saveState('hpm_selected_id', selectedProperty.id);
    }
  }, [dataMode, selectedProperty]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_units', units); }, [dataMode, units]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_expenses', expenses); }, [dataMode, expenses]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_rules', rules); }, [dataMode, rules]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_issues', issues); }, [dataMode, issues]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_bank_tx', bankTransactions); }, [dataMode, bankTransactions]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_payment_ledger', paymentLedger); }, [dataMode, paymentLedger]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_documents', documents); }, [dataMode, documents]);

  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_account_notices', accountNotices); }, [accountNotices, dataMode]);
  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_calendar_events', calendarEvents); }, [calendarEvents, dataMode]);
  useEffect(() => { if (dataMode === 'local-demo') saveState('hpm_statement_batches', statementBatches); }, [dataMode, statementBatches]);

  // Existing published demo periods predate batch tracking. Snapshot their
  // currently verified expenses once, so only later expenses become corrections.
  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    setStatementBatches((previous) => {
      const additions: StatementBatch[] = [];
      for (const property of properties.filter((item) => item.status === 'Published')) {
        if (previous.some((batch) => batch.propertyId === property.id && batch.period === property.period)) continue;
        const propertyExpenses = expenses.filter((expense) =>
          expense.propertyId === property.id && expense.status === 'Verified'
        );
        const batchStatements = buildStatements({
          period: property.period,
          units: units.filter((unit) => unit.tenantId === property.tenantId && unit.propertyId === property.id),
          expenses: propertyExpenses,
          rules: rules.filter((rule) => (!rule.tenantId || rule.tenantId === property.tenantId) && rule.propertyId === property.id),
        });
        additions.push({
          id: `batch-legacy-${property.id}-${Date.now()}`,
          tenantId: property.tenantId ?? '',
          propertyId: property.id,
          period: property.period,
          sequence: 0,
          kind: 'initial',
          expenseIds: propertyExpenses.map((expense) => expense.id),
          unitCharges: Object.fromEntries(batchStatements.map((statement) => [statement.unitCode, statementCurrentCharges(statement)])),
          createdAt: new Date().toISOString(),
        });
      }
      return additions.length ? [...previous, ...additions] : previous;
    });
  }, [dataMode, expenses, properties, rules, units]);

  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    saveState('hpm_tenant_users', tenantUsers);
  }, [dataMode, tenantUsers]);

  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    saveState('hpm_tenant_requests', tenantRequests);
  }, [dataMode, tenantRequests]);

  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    saveState('hpm_tenants_v2', tenants);
  }, [dataMode, tenants]);

  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    saveState('hpm_subscriptions', subscriptions);
  }, [dataMode, subscriptions]);

  useEffect(() => {
    if (dataMode !== 'local-demo') return;
    saveState('hpm_pm_settings', pmSettings);
  }, [dataMode, pmSettings]);

  useEffect(() => {
    if (!currentUser) return;
    if (!canAccessTab(currentUser, activeTab)) {
      setActiveTab(getDefaultTabForRole(currentUser.role));
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const nextProperty = getScopedSelectedProperty(currentUser, selectedProperty, properties);
    if (nextProperty && nextProperty.id !== selectedProperty?.id) {
      setSelectedProperty(nextProperty);
    }
  }, [currentUser, properties, selectedProperty]);

  // Make the demo's security posture explicit (S1): in local-demo mode the role
  // lives in localStorage and is trusted verbatim — there is NO server-side
  // authorization. This is fine for demos, but the app MUST run in 'supabase'
  // mode (with server-enforced auth + RLS) before real users, data, or money.
  useEffect(() => {
    if (dataMode === 'local-demo') {
      console.warn(
        '[Atlas PM] Running in LOCAL-DEMO mode: authorization is client-side only and NOT secure. ' +
          'Switch VITE_DATA_MODE=supabase for server-enforced auth before production.'
      );
    }
  }, [dataMode]);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'platform_admin') return;
    const completed = localStorage.getItem(`atlas-tour:${TOUR_VERSION}:${currentUser.id}`) === 'completed';
    if (!completed) setTourOpen(true);
  }, [currentUser]);

  const closeTour = (completed: boolean) => {
    if (completed && currentUser) localStorage.setItem(`atlas-tour:${TOUR_VERSION}:${currentUser.id}`, 'completed');
    setTourOpen(false);
  };

  const handleWorkflowNavigate = useCallback((tab: ActiveTab, focus?: 'issuance' | 'notices') => {
    setStatementsFocus(tab === 'statements' ? focus : undefined);
    setActiveTab(tab);
  }, []);

  // Surface localStorage write failures (e.g. quota exceeded from base64 logos)
  // instead of losing the user's changes silently.
  useEffect(() => {
    const onQuota = (event: Event) => {
      const detail = (event as CustomEvent<{ quota?: boolean }>).detail;
      setStorageWarning(
        detail?.quota
          ? 'Ο τοπικός αποθηκευτικός χώρος γέμισε. Οι τελευταίες αλλαγές ΔΕΝ αποθηκεύτηκαν — αφαιρέστε μεγάλα logo/αρχεία ή συνδεθείτε στον cloud (Supabase) backend.'
          : 'Αποτυχία τοπικής αποθήκευσης. Οι τελευταίες αλλαγές ΔΕΝ αποθηκεύτηκαν.'
      );
    };
    window.addEventListener('hpm:storage-quota-exceeded', onQuota);
    return () => window.removeEventListener('hpm:storage-quota-exceeded', onQuota);
  }, []);

  // Supabase: restore session + load snapshot on mount
  useEffect(() => {
    if (dataMode !== 'supabase' || supabaseInitialized.current) return;
    supabaseInitialized.current = true;

    (async () => {
      try {
        const authRepo = await getAuthRepository();
        const session = await authRepo.getSession();
        if (!session) { setIsLoading(false); return; }

        const dataRepo = await getDataRepository();
        const snapshot = await dataRepo.loadSnapshot(session.user);

        setCurrentUser(session.user);
        setActiveTab(getDefaultTabForRole(session.user.role));
        setProperties(snapshot.properties);
        setUnits(snapshot.units);
        setExpenses(snapshot.expenses);
        setRules(snapshot.rules);
        setIssues(snapshot.issues);
        setBankTransactions(snapshot.bankTransactions);
        setPaymentLedger(snapshot.paymentLedger);
        setDocuments(snapshot.documents);
        setTenantUsers(snapshot.users);
        setTenantRequests(snapshot.tenantRequests);
        setAccountNotices(snapshot.accountNotices);
        setCalendarEvents(snapshot.calendarEvents);
        setStatementBatches(snapshot.statementBatches);
        if (snapshot.tenantBranding) {
          setPmSettings((prev) => ({ ...prev, ...snapshot.tenantBranding }));
        }
        if (snapshot.properties.length > 0) setSelectedProperty(snapshot.properties[0]);
      } catch (err) {
        console.error('Supabase init error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dataMode]);

  // Business Action 1: Add a new property
  const handleAddProperty = async (newPropData: Omit<Property, 'id' | 'issuesCount' | 'dues' | 'status'>) => {
    if (!currentUser || !hasPermission(currentUser, 'properties:manage')) return;
    let newProp: Property = {
      ...newPropData,
      id: `PRP-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: currentUser.tenantId,
      issuesCount: 0,
      dues: 0.00,
      status: 'Draft'
    };
    if (dataMode === 'supabase') {
      try { newProp = await (await getDataRepository()).createProperty(currentUser, newPropData); }
      catch (error) { console.error(error); setStorageWarning('Η πολυκατοικία δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setProperties((prev) => [newProp, ...prev]);
  };

  // Business Action 2: Add apartment unit
  const handleAddUnit = async (newUnit: Unit) => {
    if (!currentUser || !hasPermission(currentUser, 'units:manage')) return;
    if (!scopedSelectedProperty) return;
    let savedUnit: Unit = {
        ...newUnit,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id
    };
    if (dataMode === 'supabase') {
      try { savedUnit = await (await getDataRepository()).createUnit(currentUser, scopedSelectedProperty.id, savedUnit); }
      catch (error) { console.error(error); setStorageWarning('Η μονάδα δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setUnits((prev) => [...prev, savedUnit]);
    // Increment properties units count dynamically
    if (scopedSelectedProperty) {
      setProperties((prev) =>
        prev.map((p) =>
          p.id === scopedSelectedProperty.id ? { ...p, unitsCount: p.unitsCount + 1 } : p
        )
      );
    }
  };

  // Business Action 3: Edit unit
  const handleUpdateUnit = async (updatedUnit: Unit) => {
    if (!currentUser || !hasPermission(currentUser, 'units:manage')) return;
    if (!scopedSelectedProperty) return;
    let savedUnit = updatedUnit;
    if (dataMode === 'supabase') {
      try { savedUnit = await (await getDataRepository()).updateUnit(currentUser, scopedSelectedProperty.id, updatedUnit); }
      catch (error) { console.error(error); setStorageWarning('Οι αλλαγές της μονάδας δεν αποθηκεύτηκαν στο cloud.'); return; }
    }
    setUnits((prev) =>
      prev.map((u) =>
        u.id === updatedUnit.id
          ? { ...savedUnit, tenantId: u.tenantId || currentUser.tenantId, propertyId: u.propertyId || scopedSelectedProperty.id }
          : u
      )
    );
  };

  // Business Action 4: Log new monthly expense
  const handleAddExpense = async (newExpense: Expense, file?: File) => {
    if (!currentUser || !hasPermission(currentUser, 'expenses:manage')) return;
    if (!scopedSelectedProperty) return;
    let savedExpense: Expense = {
        ...newExpense,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id
    };
    if (dataMode === 'supabase') {
      try { savedExpense = await (await getDataRepository()).createExpense(currentUser, scopedSelectedProperty.id, savedExpense, file); }
      catch (error) { console.error(error); setStorageWarning('Η δαπάνη δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setExpenses((prev) => [savedExpense, ...prev]);
  };

  const handleUpdateExpense = async (updatedExpense: Expense, file?: File) => {
    if (!currentUser || !hasPermission(currentUser, 'expenses:manage')) return;
    const existing = expenses.find((expense) => expense.id === updatedExpense.id);
    if (!existing || existing.status !== 'Draft') return;
    let savedExpense: Expense = {
      ...existing,
      ...updatedExpense,
      status: 'Draft',
    };
    if (dataMode === 'supabase') {
      try { savedExpense = await (await getDataRepository()).updateExpense(currentUser, savedExpense, file); }
      catch (error) { console.error(error); setStorageWarning('Οι αλλαγές της δαπάνης δεν αποθηκεύτηκαν στο cloud.'); return; }
    }
    setExpenses((prev) => prev.map((expense) => expense.id === savedExpense.id ? savedExpense : expense));
  };

  // Business Action 5: Delete expense
  const handleDeleteExpense = async (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'expenses:manage')) return;
    if (dataMode === 'supabase') {
      try { await (await getDataRepository()).deleteExpense(currentUser, id); }
      catch (error) { console.error(error); setStorageWarning('Η δαπάνη δεν διαγράφηκε από το cloud.'); return; }
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleDownloadExpense = async (expense: Expense) => {
    if (!currentUser) return;
    if (dataMode !== 'supabase') { setStorageWarning('Το πραγματικό αρχείο είναι διαθέσιμο μετά τη μετάβαση στο production storage.'); return; }
    try {
      const url = await (await getDataRepository()).getExpenseDownloadUrl(currentUser, expense.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) { console.error(error); setStorageWarning('Δεν ήταν δυνατή η ασφαλής λήψη του παραστατικού.'); }
  };

  // Business Action 6: Toggle verified receipt
  const handleVerifyExpense = async (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'expenses:manage')) return;
    const existing = expenses.find((expense) => expense.id === id);
    if (!existing) return;
    const status = existing.status === 'Verified' ? 'Draft' : 'Verified';
    if (dataMode === 'supabase') {
      try { await (await getDataRepository()).updateExpenseStatus(currentUser, id, status); }
      catch (error) { console.error(error); setStorageWarning('Η κατάσταση της δαπάνης δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status } : e
      )
    );
  };

  // Business Action 7: Edit split allocation coefficient rule
  const handleUpdateRule = async (updatedRule: DistributionRule) => {
    if (!currentUser || !hasPermission(currentUser, 'rules:manage')) return;
    if (!scopedSelectedProperty) return;
    let savedRule = updatedRule;
    if (dataMode === 'supabase') {
      try { savedRule = await (await getDataRepository()).updateRule(currentUser, scopedSelectedProperty.id, updatedRule); }
      catch (error) { console.error(error); setStorageWarning('Ο κανόνας κατανομής δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setRules((prev) =>
      prev.map((r) =>
        r.category === updatedRule.category
          ? {
              ...savedRule,
              tenantId: r.tenantId || currentUser.tenantId,
              propertyId: r.propertyId || scopedSelectedProperty?.id
            }
          : r
      )
    );
  };

  // Business Action 8: Log issue / maintenance damage ticket
  const handleAddIssue = async (newIssue: Issue) => {
    if (!currentUser || !hasPermission(currentUser, 'issues:manage')) return;
    if (!scopedSelectedProperty) return;
    let savedIssue: Issue = {
        ...newIssue,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id,
        property: scopedSelectedProperty.name
    };
    if (dataMode === 'supabase') {
      try { savedIssue = await (await getDataRepository()).createIssue(currentUser, scopedSelectedProperty.id, savedIssue); }
      catch (error) { console.error(error); setStorageWarning('Η βλάβη δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setIssues((prev) => [savedIssue, ...prev]);
    // increment selected building's active issues count
    if (scopedSelectedProperty) {
      setProperties((prev) =>
        prev.map((p) =>
          p.id === scopedSelectedProperty.id ? { ...p, issuesCount: p.issuesCount + 1 } : p
        )
      );
    }
  };

  // Business Action 9: Advance issue tickets status in Kanban columns
  const handleUpdateIssueStatus = async (id: string, newStatus: Issue['status']) => {
    if (!currentUser || !hasPermission(currentUser, 'issues:manage')) return;
    const issue = issues.find((item) => item.id === id);
    if (!issue) return;
    const shouldCreateExpense = newStatus === 'Resolved'
      && issue.status !== 'Resolved'
      && Number(issue.estimate ?? 0) > 0
      && !expenses.some((expense) => expense.fileName === `issue:${id}`);
    const issueProperty = properties.find((property) => property.id === issue.propertyId)
      ?? properties.find((property) => property.name === issue.property);
    let generatedExpense: Expense | null = null;
    if (dataMode === 'supabase') {
      try {
        const repo = await getDataRepository();
        if (newStatus === 'Resolved') generatedExpense = (await repo.resolveIssueWithExpense(currentUser, id)).expense ?? null;
        else await repo.updateIssue(currentUser, id, { status: newStatus });
      }
      catch (error) { console.error(error); setStorageWarning('Η κατάσταση της βλάβης δεν αποθηκεύτηκε στο cloud.'); return; }
    } else if (shouldCreateExpense && issueProperty) {
      generatedExpense = {
        id: `expense-${id}`,
        tenantId: currentUser.tenantId,
        propertyId: issueProperty.id,
        date: new Date().toISOString().slice(0, 10),
        supplier: issue.technician || 'Τεχνικός συνεργάτης',
        category: 'Συντήρηση / Βλάβη',
        amount: Number(issue.estimate),
        fileName: `issue:${id}`,
        status: 'Draft'
      };
    }
    if (generatedExpense) setExpenses((previous) => [generatedExpense!, ...previous]);
    setIssues((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        // Decrement issue counts on property card if resolved
        if (newStatus === 'Resolved' && i.status !== 'Resolved' && scopedSelectedProperty) {
          setProperties((pList) =>
            pList.map((p) =>
              p.id === scopedSelectedProperty.id ? { ...p, issuesCount: Math.max(0, p.issuesCount - 1) } : p
            )
          );
        }
        return { ...i, status: newStatus };
      })
    );
  };

  // Business Action 10: Assign third-party subcontractor to fix issue
  const handleAssignTechnician = async (id: string, technician: string, estimate: number) => {
    if (!currentUser || !hasPermission(currentUser, 'issues:manage')) return;
    if (dataMode === 'supabase') {
      try { await (await getDataRepository()).updateIssue(currentUser, id, { technician, estimate, status: 'Assigned' }); }
      catch (error) { console.error(error); setStorageWarning('Η ανάθεση τεχνικού δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, technician, estimate, status: 'Assigned' } : i
      )
    );
  };

  // Business Action 11: Match bank payment (clears unit dues!)
  const handleMatchPayment = async (transactionId: string, unitId: string, amount: number) => {
    if (!currentUser || !hasPermission(currentUser, 'bank:reconcile')) return;
    // 1. Find transaction to get details before deletion
    const tx = bankTransactions.find((t) => t.id === transactionId);
    if (!tx) return;

    // The ledger entry is authoritative; all balances derive from it.
    let newPayment: PaymentLedger = {
      ...createPaymentLedgerEntryFromBankMatch({ transaction: tx, unitId, amount }),
      tenantId: currentUser.tenantId,
      propertyId: scopedSelectedProperty?.id,
      period: scopedSelectedProperty?.period,
    };
    if (dataMode === 'supabase') {
      try { newPayment = await (await getDataRepository()).reconcileBankPayment(currentUser, transactionId, unitId, amount); }
      catch (error) { console.error(error); setStorageWarning('Η τραπεζική συμφωνία δεν ολοκληρώθηκε στο cloud.'); return; }
    }
    setPaymentLedger((prev) => [newPayment, ...prev]);

    // Remove from un-reconciled bank queue
    setBankTransactions((prevTx) => prevTx.filter((t) => t.id !== transactionId));
  };

  // Business Action 12: Add direct cash payment
  const handleAddCashPayment = async (unitId: string, amount: number, payer: string) => {
    if (!currentUser || !hasPermission(currentUser, 'bank:reconcile')) return;
    // Log cash receipt; reconciled balances derive from this entry.
    const today = new Date();
    const formattedDate = today.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    let newPayment: PaymentLedger = {
      id: `pay-${Date.now()}`,
      tenantId: currentUser.tenantId,
      propertyId: scopedSelectedProperty?.id,
      period: scopedSelectedProperty?.period,
      date: formattedDate,
      payer,
      unit: unitId,
      paymentCode: `CSH-${Math.floor(1000 + Math.random() * 9000)}`,
      amount,
      method: 'Μετρητά',
      matchType: 'ΧΕΙΡΟΚΙΝΗΤΗ',
      status: 'Ολοκληρώθηκε'
    };

    if (dataMode === 'supabase' && scopedSelectedProperty) {
      try { newPayment = await (await getDataRepository()).createCashPayment(currentUser, scopedSelectedProperty.id, unitId, amount, payer); }
      catch (error) { console.error(error); setStorageWarning('Η πληρωμή μετρητών δεν αποθηκεύτηκε στο cloud.'); return; }
    }

    setPaymentLedger((prev) => [newPayment, ...prev]);
  };

  // Business Action 13: Add document to archive
  const handleAddDocument = async (newDoc: Document, file: File) => {
    if (!currentUser || !hasPermission(currentUser, 'docs:manage')) return;
    if (!scopedSelectedProperty) return;
    let savedDocument: Document = {
        ...newDoc,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id
    };
    if (dataMode === 'supabase') {
      try { savedDocument = await (await getDataRepository()).createDocument(currentUser, scopedSelectedProperty.id, savedDocument, file); }
      catch (error) { console.error(error); setStorageWarning('Το έγγραφο δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setDocuments((prev) => [savedDocument, ...prev]);
  };

  const handleDownloadDocument = async (document: Document) => {
    if (!currentUser) return;
    if (dataMode !== 'supabase') { setStorageWarning('Η λήψη πραγματικού αρχείου ενεργοποιείται στο production storage.'); return; }
    try {
      const url = await (await getDataRepository()).getDocumentDownloadUrl(currentUser, document.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) { console.error(error); setStorageWarning('Δεν ήταν δυνατή η ασφαλής λήψη του εγγράφου.'); }
  };

  // Business Action 14: Delete document from library
  const handleDeleteDocument = async (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'docs:manage')) return;
    if (dataMode === 'supabase') {
      try { await (await getDataRepository()).deleteDocument(currentUser, id); }
      catch (error) { console.error(error); setStorageWarning('Το έγγραφο δεν διαγράφηκε από το cloud.'); return; }
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Business Action 15: Publish Period Statements & lock ledger
  const handlePublishPeriod = async () => {
    if (!currentUser || !hasPermission(currentUser, 'statements:publish')) return;
    if (!scopedSelectedProperty) return;

    const issuedExpenses = visibleExpenses.filter((expense) => expense.status === 'Verified');
    const issuedStatements = buildStatements({
      period: scopedSelectedProperty.period,
      units: statementUnits,
      expenses: issuedExpenses,
      rules,
    });
    let initialBatch: StatementBatch = {
      id: `batch-${Date.now()}`,
      tenantId: currentUser.tenantId,
      propertyId: scopedSelectedProperty.id,
      period: scopedSelectedProperty.period,
      sequence: 0,
      kind: 'initial',
      expenseIds: issuedExpenses.map((expense) => expense.id),
      unitCharges: Object.fromEntries(issuedStatements.map((statement) => [statement.unitCode, statementCurrentCharges(statement)])),
      idempotencyKey: `${currentUser.tenantId}:${scopedSelectedProperty.id}:${scopedSelectedProperty.period}:initial`,
      unitSnapshot: statementUnits,
      ruleSnapshot: rules.filter((rule) => rule.propertyId === scopedSelectedProperty.id),
      expenseSnapshot: issuedExpenses,
      createdAt: new Date().toISOString(),
    };
    if (dataMode === 'supabase') {
      try { initialBatch = await (await getDataRepository()).createStatementBatch(currentUser, initialBatch); }
      catch (error) { console.error(error); setStorageWarning('Το ιστορικό της αρχικής έκδοσης δεν αποθηκεύτηκε στο cloud.'); return; }
      try { await (await getDataRepository()).publishStatements(currentUser, scopedSelectedProperty.id, scopedSelectedProperty.period); }
      catch (error) { console.error(error); setStorageWarning('Η έκδοση κοινοχρήστων δεν ολοκληρώθηκε στο cloud. Μπορείτε να την επαναλάβετε με ασφάλεια.'); return; }
    }
    setStatementBatches((previous) => [...previous, initialBatch]);

    // Set building status to Published
    setProperties((prev) =>
      prev.map((p) =>
        p.id === scopedSelectedProperty.id ? { ...p, status: 'Published' } : p
      )
    );

    // Set selected property state inline to match
    setSelectedProperty((prev) => (prev ? { ...prev, status: 'Published' } : null));

    alert("Οι λογαριασμοί κοινοχρήστων εκδόθηκαν επιτυχώς και απεστάλησαν ηλεκτρονικά στους ενοίκους!");
  };

  const handlePublishCorrection = async (expenseIds: string[], reason: string) => {
    if (!currentUser || !hasPermission(currentUser, 'statements:publish') || !scopedSelectedProperty) return;
    const correctionExpenses = visibleExpenses.filter((expense) => expenseIds.includes(expense.id) && expense.status === 'Verified');
    if (!correctionExpenses.length || !reason.trim()) return;
    const existingBatches = statementBatches.filter((batch) =>
      batch.propertyId === scopedSelectedProperty.id && batch.period === scopedSelectedProperty.period
    );
    const sequence = Math.max(0, ...existingBatches.map((batch) => batch.sequence)) + 1;
    const correctionStatements = buildStatements({
      period: scopedSelectedProperty.period,
      units: statementUnits,
      expenses: correctionExpenses,
      rules,
    });
    let batch: StatementBatch = {
      id: `batch-${Date.now()}`,
      tenantId: currentUser.tenantId,
      propertyId: scopedSelectedProperty.id,
      period: scopedSelectedProperty.period,
      sequence,
      kind: 'correction',
      reason: reason.trim(),
      expenseIds: correctionExpenses.map((expense) => expense.id),
      unitCharges: Object.fromEntries(correctionStatements.map((statement) => [statement.unitCode, statementCurrentCharges(statement)])),
      idempotencyKey: `${currentUser.tenantId}:${scopedSelectedProperty.id}:${scopedSelectedProperty.period}:correction:${sequence}`,
      unitSnapshot: statementUnits,
      ruleSnapshot: rules.filter((rule) => rule.propertyId === scopedSelectedProperty.id),
      expenseSnapshot: correctionExpenses,
      createdAt: new Date().toISOString(),
    };
    if (dataMode === 'supabase') {
      try { batch = await (await getDataRepository()).createStatementBatch(currentUser, batch); }
      catch (error) { console.error(error); setStorageWarning('Η διορθωτική έκδοση δεν αποθηκεύτηκε στο cloud.'); return; }
    }
    setStatementBatches((previous) => [...previous, batch]);

    const label = `Δ${String(sequence).padStart(2, '0')}`;
    const sentAt = new Date().toISOString();
    const due = new Date();
    due.setDate(due.getDate() + 30);
    await handleSaveNotices(statementUnits.map((unit) => ({
      id: `${batch.id}:${unit.id}`,
      tenantId: currentUser.tenantId,
      propertyId: scopedSelectedProperty.id,
      unitId: unit.id,
      period: `${scopedSelectedProperty.period} · ${label}`,
      recipient: unit.ownerEmail || unit.ownerPhone || unit.residentName || unit.ownerName,
      amount: batch.unitCharges[unit.id] ?? 0,
      channel: unit.ownerEmail ? 'email' : unit.ownerPhone ? 'sms' : 'print',
      status: 'sent',
      sentAt,
      dueDate: due.toISOString().slice(0, 10),
      statementBatchId: batch.id,
    })));
  };

  const handleSaveNotices = async (notices: AccountNotice[]) => {
    if (!currentUser || !hasPermission(currentUser, 'statements:publish')) return;
    let persisted = notices;
    if (dataMode === 'supabase') {
      try {
        persisted = await (await getDataRepository()).saveAccountNotices(currentUser, notices);
        const deliveryResponse = await apiFetch('/api/notices/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noticeIds: persisted.map((notice) => notice.id) }),
        });
        if (!deliveryResponse.ok && deliveryResponse.status !== 207) {
          setStorageWarning('Τα ειδοποιητήρια αποθηκεύτηκαν ως πρόχειρα, αλλά ο πάροχος αποστολής δεν είναι ακόμη διαθέσιμος.');
        }
      } catch (error) {
        console.error('Account notice persistence failed:', error);
        setStorageWarning('Τα ειδοποιητήρια δεν αποθηκεύτηκαν στο cloud. Δοκιμάστε ξανά.');
        return;
      }
    }
    setAccountNotices((prev) => {
      const keys = new Set(persisted.map((notice) => `${notice.unitId}:${notice.period}`));
      return [...prev.filter((notice) => !keys.has(`${notice.unitId}:${notice.period}`)), ...persisted];
    });
    setCalendarEvents((prev) => {
      const incoming = new Set(notices.map((notice) => `notice:${notice.id}`));
      const reminderEvents: CalendarEvent[] = notices.map((notice) => ({
        id: `notice:${notice.id}`,
        tenantId: notice.tenantId,
        propertyId: notice.propertyId,
        title: `Λήξη ειδοποιητηρίου ${notice.unitId} · ${notice.amount.toLocaleString('el-GR')} €`,
        date: notice.dueDate,
        type: 'deadline',
        notes: `${notice.period} · Παραλήπτης: ${notice.recipient}`
      }));
      return [...prev.filter((event) => !incoming.has(event.id)), ...reminderEvents];
    });
  };

  const handleAddCalendarEvent = async (event: CalendarEvent) => {
    if (!currentUser || !hasPermission(currentUser, 'calendar:manage')) return;
    try {
      const saved = dataMode === 'supabase'
        ? await (await getDataRepository()).createCalendarEvent(currentUser, event)
        : event;
      setCalendarEvents((prev) => [saved, ...prev]);
    } catch (error) {
      console.error('Calendar event creation failed:', error);
      setStorageWarning('Το γεγονός δεν αποθηκεύτηκε στο cloud. Δοκιμάστε ξανά.');
    }
  };

  const handleDeleteCalendarEvent = async (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'calendar:manage')) return;
    if (dataMode === 'supabase') {
      try {
        await (await getDataRepository()).deleteCalendarEvent(currentUser, id);
      } catch (error) {
        console.error('Calendar event deletion failed:', error);
        setStorageWarning('Το γεγονός δεν διαγράφηκε από το cloud. Δοκιμάστε ξανά.');
        return;
      }
    }
    setCalendarEvents((prev) => prev.filter((event) => event.id !== id));
  };

  // Switch context navigation helper
  const handleSelectPropertyPrompt = () => {
    setActiveTab('properties');
  };

  const handleLogout = () => {
    if (dataMode === 'supabase') {
      getAuthRepository().then((repo) => repo.signOut()).catch(console.error);
    } else {
      clearAuthUser();
    }
    setCurrentUser(null);
    setActiveTab('properties');
    supabaseInitialized.current = false;
  };

  const handleInviteUser = async (user: AuthUser) => {
    if (!currentUser || !hasPermission(currentUser, 'admin:view')) return;
    try {
      const saved = dataMode === 'supabase' ? await (await getDataRepository()).inviteUser(currentUser, user) : user;
      setTenantUsers((prev) => [saved, ...prev]);
    } catch (error) { console.error(error); setStorageWarning('Η πρόσκληση χρήστη δεν αποθηκεύτηκε στο cloud.'); }
  };

  const handleAddUser = (user: AuthUser) => {
    if (!currentUser || !platformCan(currentUser, 'ManageUsers')) return;
    setTenantUsers((prev) => [user, ...prev]);
  };

  const handleUpdateSubscription = (subscription: TenantSubscription) => {
    if (!currentUser || !platformCan(currentUser, 'ManagePlatformSubscription')) return;
    setSubscriptions((prev) => prev.map((existing) => (existing.id === subscription.id ? subscription : existing)));
  };

  const handleUpdatePmSettings = (settings: PmSettings) => {
    if (!currentUser || !platformCan(currentUser, 'ManagePMSettings')) return;
    setPmSettings(settings);
    setTenants((prev) => prev.map((tenant) =>
      tenant.id === currentUser.tenantId
        ? { ...tenant, companyName: settings.organizationName, logoUrl: settings.logoUrl }
        : tenant
    ));
    if (dataMode === 'supabase') {
      getDataRepository()
        .then((repo) => repo.updateTenantBranding(currentUser, settings))
        .catch((error) => {
          console.error('Tenant branding update failed:', error);
          setStorageWarning('Το λογότυπο ενημερώθηκε τοπικά, αλλά δεν αποθηκεύτηκε στο cloud. Δοκιμάστε ξανά.');
        });
    }
  };

  const handleUpdateTenantUser = async (updatedUser: AuthUser) => {
    if (!currentUser || !canEditUser(currentUser, updatedUser)) return;
    try {
      const saved = dataMode === 'supabase' ? await (await getDataRepository()).updateUser(currentUser, updatedUser) : updatedUser;
      setTenantUsers((prev) => prev.map((user) => (user.id === saved.id ? saved : user)));
      if (currentUser.id === saved.id) setCurrentUser(saved);
    } catch (error) { console.error(error); setStorageWarning('Ο χρήστης δεν ενημερώθηκε στο cloud.'); }
  };

  const handleUpdateProfile = async (updatedUser: AuthUser) => {
    if (!currentUser || currentUser.id !== updatedUser.id) return;
    try {
      const saved = dataMode === 'supabase' ? await (await getDataRepository()).updateOwnProfile(updatedUser) : updatedUser;
      setCurrentUser(saved);
      if (dataMode === 'local-demo') saveAuthUser(saved);
      setTenantUsers((prev) => prev.map((user) => (user.id === saved.id ? saved : user)));
    } catch (error) { console.error(error); setStorageWarning('Το προφίλ δεν ενημερώθηκε στο cloud.'); }
  };

  const handleAddTenant = (tenant: Tenant) => {
    if (!currentUser || !hasPermission(currentUser, 'tenants:manage')) return;
    setTenants((prev) => [tenant, ...prev]);
  };

  const handleUpdateTenant = (tenant: Tenant) => {
    if (!currentUser || !hasPermission(currentUser, 'tenants:manage')) return;
    setTenants((prev) => prev.map((existing) => (existing.id === tenant.id ? tenant : existing)));
  };

  const handleDeleteTenant = (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'tenants:manage')) return;
    // Soft delete — flip IsDeleted so the record leaves the active list.
    setTenants((prev) => prev.map((existing) => (existing.id === id ? { ...existing, isDeleted: true } : existing)));
  };

  const handlePublicTenantRequest = (request: TenantRegistrationRequest) => {
    setTenantRequests((prev) =>
      prev.some((existing) => existing.id === request.id) ? prev : [request, ...prev]
    );
  };

  const handleApproveTenantRequest = async (requestId: string) => {
    if (!currentUser || !hasPermission(currentUser, 'admin:manage')) return;
    if (dataMode === 'supabase') {
      try { await (await getDataRepository()).approveTenantRequest(currentUser, requestId); }
      catch (error) { console.error(error); setStorageWarning('Το αίτημα δεν ενημερώθηκε στο cloud.'); return; }
    }
    setTenantRequests((prev) =>
      prev.map((request) => (request.id === requestId ? { ...request, status: 'approved' } : request))
    );
  };

  const renderActiveView = () => {
    if (!currentUser) return null;
    if (!canAccessTab(currentUser, activeTab)) return null;

    const canManageProperties = hasPermission(currentUser, 'properties:manage');
    const canManageUnits = hasPermission(currentUser, 'units:manage');
    const canManageExpenses = hasPermission(currentUser, 'expenses:manage');
    const canManageRules = hasPermission(currentUser, 'rules:manage');
    const canPublishStatements = hasPermission(currentUser, 'statements:publish');
    const canManageIssues = hasPermission(currentUser, 'issues:manage');
    const canReconcileBank = hasPermission(currentUser, 'bank:reconcile');
    const canManageDocuments = hasPermission(currentUser, 'docs:manage');
    const canManageTenants = hasPermission(currentUser, 'tenants:manage');

    switch (activeTab) {
      case 'dashboard':
        return currentUser.role === 'owner' || currentUser.role === 'resident' ? (
          <OwnerDashboardView
            currentUser={currentUser}
            properties={visibleProperties}
            units={visibleUnits}
            allocationUnits={propertyUnits}
            expenses={visibleExpenses}
            rules={propertyRules}
            issues={visibleIssues}
            notices={accountNotices.filter((notice) => notice.tenantId === currentUser.tenantId)}
            statementBatches={statementBatches.filter((batch) => batch.propertyId === scopedSelectedProperty?.id && batch.period === scopedSelectedProperty?.period)}
            onOpenIssues={() => setActiveTab('issues')}
          />
        ) : (
          <CompanyDashboardView
            property={scopedSelectedProperty}
            units={propertyUnits}
            expenses={visibleExpenses}
            rules={rules}
            notices={accountNotices}
            onNavigate={handleWorkflowNavigate}
          />
        );
      case 'admin':
        return (
          <AdminConsoleView
            currentUser={currentUser}
            users={tenantUsers.filter((user) => user.tenantId === currentUser.tenantId)}
            tenantRequests={tenantRequests}
            onInviteUser={handleInviteUser}
            onUpdateUser={handleUpdateTenantUser}
            onApproveTenantRequest={handleApproveTenantRequest}
            properties={visibleProperties}
          />
        );
      case 'tenants':
        return (
          <TenantsView
            tenants={tenants}
            subscriptions={subscriptions}
            onAddTenant={handleAddTenant}
            onUpdateTenant={handleUpdateTenant}
            onDeleteTenant={handleDeleteTenant}
            canManageTenants={canManageTenants}
          />
        );
      case 'users':
        return (
          <UsersView
            users={
              currentUser.role === 'platform_admin'
                ? tenantUsers
                : tenantUsers.filter((user) => user.tenantId === currentUser.tenantId)
            }
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateTenantUser}
            canManageUsers={platformCan(currentUser, 'ManageUsers')}
          />
        );
      case 'subscriptions':
        return (
          <SubscriptionsView
            subscriptions={subscriptions}
            canManage={platformCan(currentUser, 'ManagePlatformSubscription')}
            onUpdateSubscription={handleUpdateSubscription}
          />
        );
      case 'settings':
        return (
          <PmSettingsView
            settings={{ ...pmSettings, organizationName: workspaceBrandName, logoUrl: workspaceLogoUrl }}
            canManage={platformCan(currentUser, 'ManagePMSettings')}
            onSave={handleUpdatePmSettings}
          />
        );
      case 'properties':
        return (
          <PropertiesView
            properties={visibleProperties}
            onSelectProperty={setSelectedProperty}
            selectedProperty={scopedSelectedProperty}
            onAddProperty={handleAddProperty}
            canManageProperties={canManageProperties}
          />
        );
      case 'units':
        return (
          <UnitsView
            selectedProperty={scopedSelectedProperty}
            units={propertyUnits}
            onAddUnit={handleAddUnit}
            onUpdateUnit={handleUpdateUnit}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canManageUnits={canManageUnits}
          />
        );
      case 'expenses':
        return (
          <ExpensesView
            selectedProperty={scopedSelectedProperty}
            expenses={visibleExpenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onDownloadExpense={handleDownloadExpense}
            onVerifyExpense={handleVerifyExpense}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canManageExpenses={canManageExpenses}
          />
        );
      case 'rules':
        return (
          <RulesView
            selectedProperty={scopedSelectedProperty}
            units={propertyUnits}
            rules={propertyRules}
            onUpdateRule={handleUpdateRule}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canManageRules={canManageRules}
          />
        );
      case 'statements':
        return (
          <StatementsView
            selectedProperty={scopedSelectedProperty}
            units={statementUnits}
            allocationUnits={propertyUnits}
            expenses={visibleExpenses}
            rules={propertyRules}
            onPublishPeriod={handlePublishPeriod}
            onPublishCorrection={handlePublishCorrection}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canPublishStatements={canPublishStatements}
            notices={accountNotices.filter((notice) => notice.tenantId === currentUser.tenantId && notice.propertyId === scopedSelectedProperty?.id)}
            onSaveNotices={handleSaveNotices}
            organizationName={workspaceBrandName}
            focusSection={statementsFocus}
            statementBatches={statementBatches.filter((batch) => batch.propertyId === scopedSelectedProperty?.id && batch.period === scopedSelectedProperty?.period)}
          />
        );
      case 'invoicing':
        return <InvoicingView property={scopedSelectedProperty} properties={visibleProperties} expenses={expenses} units={units} currentUser={currentUser} />;
      case 'assemblies':
        return <AssemblyView property={scopedSelectedProperty} units={propertyUnits} currentUser={currentUser} />;
      case 'calendar':
        return (
          <CalendarView
            currentUser={currentUser}
            properties={visibleProperties}
            expenses={expenses}
            issues={issues}
            events={calendarEvents.filter((event) => event.tenantId === currentUser.tenantId)}
            onAddEvent={handleAddCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
            canManage={hasPermission(currentUser, 'calendar:manage')}
          />
        );
      case 'issues':
        return (
          <IssuesView
            selectedProperty={scopedSelectedProperty}
            issues={visibleIssues}
            expenses={visibleExpenses}
            onAddIssue={handleAddIssue}
            onUpdateIssueStatus={handleUpdateIssueStatus}
            onAssignTechnician={handleAssignTechnician}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canManageIssues={canManageIssues}
          />
        );
      case 'bank':
        return (
          <BankLedgerView
            selectedProperty={scopedSelectedProperty}
            units={propertyUnits}
            bankTransactions={visibleBankTransactions}
            paymentLedger={visiblePaymentLedger}
            onMatchPayment={handleMatchPayment}
            onAddCashPayment={handleAddCashPayment}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canReconcileBank={canReconcileBank}
          />
        );
      case 'docs':
        return (
          <DocumentsView
            selectedProperty={scopedSelectedProperty}
            documents={visibleDocuments}
            onAddDocument={handleAddDocument}
            onDownloadDocument={handleDownloadDocument}
            onDeleteDocument={handleDeleteDocument}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canManageDocuments={canManageDocuments}
          />
        );
      case 'profile':
        return <ProfileSettingsView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />;
      default:
        return <div>View not found</div>;
    }
  };

  const hydrateSupabaseUser = async (user: AuthUser) => {
    const dataRepo = await getDataRepository();
    const snapshot = await dataRepo.loadSnapshot(user);
    setProperties(snapshot.properties);
    setUnits(snapshot.units);
    setExpenses(snapshot.expenses);
    setRules(snapshot.rules);
    setIssues(snapshot.issues);
    setBankTransactions(snapshot.bankTransactions);
    setPaymentLedger(snapshot.paymentLedger);
    setDocuments(snapshot.documents);
    setTenantUsers(snapshot.users);
    setTenantRequests(snapshot.tenantRequests);
    setAccountNotices(snapshot.accountNotices);
    setCalendarEvents(snapshot.calendarEvents);
    setStatementBatches(snapshot.statementBatches);
    if (snapshot.tenantBranding) {
      setPmSettings((prev) => ({ ...prev, ...snapshot.tenantBranding }));
    }
    if (snapshot.properties.length > 0) setSelectedProperty(snapshot.properties[0]);
    setActiveTab(getDefaultTabForRole(user.role));
    return user;
  };

  const handleSupabaseLogin = async (email: string, password: string) => {
    const session = await (await getAuthRepository()).signIn({ email, password });
    return hydrateSupabaseUser(session.user);
  };

  const handleSupabaseMfa = async (code: string) => {
    const session = await (await getAuthRepository()).verifyMfa(code);
    return hydrateSupabaseUser(session.user);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#004349]">
        <div className="text-center text-white">
          <div className="text-2xl font-black mb-2">Atlas PM</div>
          <div className="text-sm text-white/60">Φόρτωση δεδομένων…</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onAuthenticated={setCurrentUser}
        loginOverride={dataMode === 'supabase' ? handleSupabaseLogin : undefined}
        mfaVerifyOverride={dataMode === 'supabase' ? handleSupabaseMfa : undefined}
        onSubmitTenantRequest={handlePublicTenantRequest}
      />
    );
  }

  return (
    <div id="hpm-app-layout" className="app-layout min-h-screen pl-64 font-sans bg-surface text-on-surface">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        brandName={workspaceBrandName}
        logoUrl={workspaceLogoUrl}
        currentUser={currentUser}
      />

      {/* Main content viewport */}
      <div className="flex flex-col min-h-screen">
        {/* Top Header bar with clock, profile and building switch */}
        <Header
          selectedProperty={scopedSelectedProperty}
          properties={visibleProperties}
          onSelectProperty={setSelectedProperty}
          currentUser={currentUser}
          brandName="Atlas PM"
          onLogout={handleLogout}
          onOpenProfile={() => setActiveTab('profile')}
          onStartTour={() => setTourOpen(true)}
        />

        <GuidedTour user={currentUser} open={tourOpen} onClose={closeTour} onNavigate={handleWorkflowNavigate} />

        {storageWarning && (
          <div role="alert" className="flex items-start justify-between gap-4 border-b border-amber-300 bg-amber-50 px-6 py-3 text-sm text-amber-900">
            <span className="font-semibold">{storageWarning}</span>
            <button
              onClick={() => setStorageWarning(null)}
              aria-label="Κλείσιμο"
              className="flex-none rounded px-2 py-0.5 text-amber-700 hover:bg-amber-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard inner content */}
        <main className="app-main flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {(currentUser.role === 'owner' || currentUser.role === 'resident') && activeTab !== 'dashboard' && (
            <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
              <div className="text-sm font-bold text-primary">Περιορισμένη πρόσβαση portal</div>
              <p className="mt-1 text-sm text-on-surface-variant">
                Βλέπετε μόνο κοινόχρηστα, πληρωμές, βλάβες και έγγραφα που αφορούν τον λογαριασμό σας.
              </p>
              <p className="mt-2 text-xs font-semibold text-primary">
                {describeUserScope(currentUser, units, scopedSelectedProperty)}
              </p>
            </div>
          )}
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
