import React, { useState, useEffect, useMemo } from 'react';
import {
  Property,
  Unit,
  Expense,
  DistributionRule,
  Issue,
  BankTransaction,
  PaymentLedger,
  Document,
  TenantRegistrationRequest,
  getSavedState,
  saveState,
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
import {
  calculateBalanceAfterPayment,
  createPaymentLedgerEntryFromBankMatch
} from './lib/paymentLedger';
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
import ProfileSettingsView from './components/ProfileSettingsView';

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getSavedAuthUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const savedUser = getSavedAuthUser();
    return savedUser ? getDefaultTabForRole(savedUser.role) : 'properties';
  });

  // Load state or use initial mock databases
  const [properties, setProperties] = useState<Property[]>(() =>
    getSavedState<Property[]>('hpm_properties', INITIAL_PROPERTIES)
  );
  
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(() => {
    const saved = getSavedState<string | null>('hpm_selected_id', 'ATH-0226');
    const found = INITIAL_PROPERTIES.find((p) => p.id === saved);
    return found || INITIAL_PROPERTIES[0];
  });

  const [units, setUnits] = useState<Unit[]>(() =>
    getSavedState<Unit[]>('hpm_units', INITIAL_UNITS)
  );

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getSavedState<Expense[]>('hpm_expenses', INITIAL_EXPENSES)
  );

  const [rules, setRules] = useState<DistributionRule[]>(() =>
    getSavedState<DistributionRule[]>('hpm_rules', INITIAL_RULES)
  );

  const [issues, setIssues] = useState<Issue[]>(() =>
    getSavedState<Issue[]>('hpm_issues', INITIAL_ISSUES)
  );

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() =>
    getSavedState<BankTransaction[]>('hpm_bank_tx', INITIAL_BANK_TRANSACTIONS)
  );

  const [paymentLedger, setPaymentLedger] = useState<PaymentLedger[]>(() =>
    getSavedState<PaymentLedger[]>('hpm_payment_ledger', INITIAL_PAYMENT_LEDGER)
  );

  const [documents, setDocuments] = useState<Document[]>(() =>
    getSavedState<Document[]>('hpm_documents', INITIAL_DOCUMENTS)
  );

  const [tenantUsers, setTenantUsers] = useState<AuthUser[]>(() =>
    getSavedState<AuthUser[]>('hpm_tenant_users', getDemoTenantUsers())
  );

  const [tenantRequests, setTenantRequests] = useState<TenantRegistrationRequest[]>(() =>
    getSavedState<TenantRegistrationRequest[]>('hpm_tenant_requests', INITIAL_TENANT_REQUESTS)
  );

  const scopedSelectedProperty = useMemo(
    () => (currentUser ? getScopedSelectedProperty(currentUser, selectedProperty, properties) : selectedProperty),
    [currentUser, properties, selectedProperty]
  );

  const visibleProperties = useMemo(
    () => (currentUser ? getVisibleProperties(currentUser, properties) : properties),
    [currentUser, properties]
  );

  const propertyUnits = useMemo(
    () => (currentUser ? getPropertyUnits(currentUser, units, scopedSelectedProperty) : units),
    [currentUser, scopedSelectedProperty, units]
  );

  const visibleUnits = useMemo(
    () => (currentUser ? getVisibleUnits(currentUser, units, scopedSelectedProperty) : units),
    [currentUser, scopedSelectedProperty, units]
  );

  const statementUnits = currentUser && isCompanyUser(currentUser) ? propertyUnits : visibleUnits;

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
    saveState('hpm_properties', properties);
  }, [properties]);

  useEffect(() => {
    if (selectedProperty) {
      saveState('hpm_selected_id', selectedProperty.id);
    }
  }, [selectedProperty]);

  useEffect(() => {
    saveState('hpm_units', units);
  }, [units]);

  useEffect(() => {
    saveState('hpm_expenses', expenses);
  }, [expenses]);

  useEffect(() => {
    saveState('hpm_rules', rules);
  }, [rules]);

  useEffect(() => {
    saveState('hpm_issues', issues);
  }, [issues]);

  useEffect(() => {
    saveState('hpm_bank_tx', bankTransactions);
  }, [bankTransactions]);

  useEffect(() => {
    saveState('hpm_payment_ledger', paymentLedger);
  }, [paymentLedger]);

  useEffect(() => {
    saveState('hpm_documents', documents);
  }, [documents]);

  useEffect(() => {
    saveState('hpm_tenant_users', tenantUsers);
  }, [tenantUsers]);

  useEffect(() => {
    saveState('hpm_tenant_requests', tenantRequests);
  }, [tenantRequests]);

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

  // Business Action 1: Add a new property
  const handleAddProperty = (newPropData: Omit<Property, 'id' | 'issuesCount' | 'dues' | 'status'>) => {
    if (!currentUser || !hasPermission(currentUser, 'properties:manage')) return;
    const newProp: Property = {
      ...newPropData,
      id: `PRP-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: currentUser.tenantId,
      issuesCount: 0,
      dues: 0.00,
      status: 'Draft'
    };
    setProperties((prev) => [newProp, ...prev]);
  };

  // Business Action 2: Add apartment unit
  const handleAddUnit = (newUnit: Unit) => {
    if (!currentUser || !hasPermission(currentUser, 'units:manage')) return;
    if (!scopedSelectedProperty) return;
    setUnits((prev) => [
      ...prev,
      {
        ...newUnit,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id
      }
    ]);
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
  const handleUpdateUnit = (updatedUnit: Unit) => {
    if (!currentUser || !hasPermission(currentUser, 'units:manage')) return;
    setUnits((prev) =>
      prev.map((u) =>
        u.id === updatedUnit.id
          ? { ...updatedUnit, tenantId: u.tenantId || currentUser.tenantId, propertyId: u.propertyId || scopedSelectedProperty?.id }
          : u
      )
    );
  };

  // Business Action 4: Log new monthly expense
  const handleAddExpense = (newExpense: Expense) => {
    if (!currentUser || !hasPermission(currentUser, 'expenses:manage')) return;
    if (!scopedSelectedProperty) return;
    setExpenses((prev) => [
      {
        ...newExpense,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id
      },
      ...prev
    ]);
  };

  // Business Action 5: Delete expense
  const handleDeleteExpense = (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'expenses:manage')) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Business Action 6: Toggle verified receipt
  const handleVerifyExpense = (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'expenses:manage')) return;
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === 'Verified' ? 'Draft' : 'Verified' } : e
      )
    );
  };

  // Business Action 7: Edit split allocation coefficient rule
  const handleUpdateRule = (updatedRule: DistributionRule) => {
    if (!currentUser || !hasPermission(currentUser, 'rules:manage')) return;
    setRules((prev) =>
      prev.map((r) =>
        r.category === updatedRule.category
          ? {
              ...updatedRule,
              tenantId: r.tenantId || currentUser.tenantId,
              propertyId: r.propertyId || scopedSelectedProperty?.id
            }
          : r
      )
    );
  };

  // Business Action 8: Log issue / maintenance damage ticket
  const handleAddIssue = (newIssue: Issue) => {
    if (!currentUser || !hasPermission(currentUser, 'issues:manage')) return;
    if (!scopedSelectedProperty) return;
    setIssues((prev) => [
      {
        ...newIssue,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id,
        property: scopedSelectedProperty.name
      },
      ...prev
    ]);
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
  const handleUpdateIssueStatus = (id: string, newStatus: Issue['status']) => {
    if (!currentUser || !hasPermission(currentUser, 'issues:manage')) return;
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
  const handleAssignTechnician = (id: string, technician: string, estimate: number) => {
    if (!currentUser || !hasPermission(currentUser, 'issues:manage')) return;
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, technician, estimate, status: 'Assigned' } : i
      )
    );
  };

  // Business Action 11: Match bank payment (clears unit dues!)
  const handleMatchPayment = (transactionId: string, unitId: string, amount: number) => {
    if (!currentUser || !hasPermission(currentUser, 'bank:reconcile')) return;
    // 1. Find transaction to get details before deletion
    const tx = bankTransactions.find((t) => t.id === transactionId);
    if (!tx) return;

    const nextBalance = calculateBalanceAfterPayment({
      unitId,
      paymentAmount: amount,
      period: scopedSelectedProperty?.period || 'Ιούνιος 2026',
      units: propertyUnits,
      expenses: visibleExpenses,
      rules
    });

    // 2. Recalculate the unit balance from statement ledger + payment
    setUnits((prevUnits) =>
      prevUnits.map((u) =>
        u.id === unitId ? { ...u, balance: nextBalance } : u
      )
    );

    // 3. Subtract matched amount from associated building's outstanding dues
    if (scopedSelectedProperty) {
      setProperties((prevProperties) =>
        prevProperties.map((p) =>
          p.id === scopedSelectedProperty.id ? { ...p, dues: Math.max(0, p.dues - amount) } : p
        )
      );
    }

    // 4. Create historical payment entry in ledger
    const newPayment = {
      ...createPaymentLedgerEntryFromBankMatch({ transaction: tx, unitId, amount }),
      tenantId: currentUser.tenantId,
      propertyId: scopedSelectedProperty?.id
    };
    setPaymentLedger((prev) => [newPayment, ...prev]);

    // 5. Remove from un-reconciled bank queue
    setBankTransactions((prevTx) => prevTx.filter((t) => t.id !== transactionId));
  };

  // Business Action 12: Add direct cash payment
  const handleAddCashPayment = (unitId: string, amount: number, payer: string) => {
    if (!currentUser || !hasPermission(currentUser, 'bank:reconcile')) return;
    const nextBalance = calculateBalanceAfterPayment({
      unitId,
      paymentAmount: amount,
      period: scopedSelectedProperty?.period || 'Ιούνιος 2026',
      units: propertyUnits,
      expenses: visibleExpenses,
      rules
    });

    // 1. Recalculate balance from statement ledger + payment
    setUnits((prevUnits) =>
      prevUnits.map((u) =>
        u.id === unitId ? { ...u, balance: nextBalance } : u
      )
    );

    // 2. Reduce building dues
    if (scopedSelectedProperty) {
      setProperties((prevProperties) =>
        prevProperties.map((p) =>
          p.id === scopedSelectedProperty.id ? { ...p, dues: Math.max(0, p.dues - amount) } : p
        )
      );
    }

    // 3. Log cash receipt
    const today = new Date();
    const formattedDate = today.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const newPayment: PaymentLedger = {
      id: `pay-${Date.now()}`,
      tenantId: currentUser.tenantId,
      propertyId: scopedSelectedProperty?.id,
      date: formattedDate,
      payer,
      unit: unitId,
      paymentCode: `CSH-${Math.floor(1000 + Math.random() * 9000)}`,
      amount,
      method: 'Μετρητά',
      matchType: 'ΧΕΙΡΟΚΙΝΗΤΗ',
      status: 'Ολοκληρώθηκε'
    };

    setPaymentLedger((prev) => [newPayment, ...prev]);
  };

  // Business Action 13: Add document to archive
  const handleAddDocument = (newDoc: Document) => {
    if (!currentUser || !hasPermission(currentUser, 'docs:manage')) return;
    if (!scopedSelectedProperty) return;
    setDocuments((prev) => [
      {
        ...newDoc,
        tenantId: currentUser.tenantId,
        propertyId: scopedSelectedProperty.id
      },
      ...prev
    ]);
  };

  // Business Action 14: Delete document from library
  const handleDeleteDocument = (id: string) => {
    if (!currentUser || !hasPermission(currentUser, 'docs:manage')) return;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Business Action 15: Publish Period Statements & lock ledger
  const handlePublishPeriod = () => {
    if (!currentUser || !hasPermission(currentUser, 'statements:publish')) return;
    if (!scopedSelectedProperty) return;

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

  // Switch context navigation helper
  const handleSelectPropertyPrompt = () => {
    setActiveTab('properties');
  };

  const handleLogout = () => {
    clearAuthUser();
    setCurrentUser(null);
    setActiveTab('properties');
  };

  const handleInviteUser = (user: AuthUser) => {
    if (!currentUser || !hasPermission(currentUser, 'admin:view')) return;
    setTenantUsers((prev) => [user, ...prev]);
  };

  const handleUpdateTenantUser = (updatedUser: AuthUser) => {
    if (!currentUser || !canEditUser(currentUser, updatedUser)) return;
    setTenantUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      saveAuthUser(updatedUser);
    }
  };

  const handleUpdateProfile = (updatedUser: AuthUser) => {
    if (!currentUser || currentUser.id !== updatedUser.id) return;
    setCurrentUser(updatedUser);
    saveAuthUser(updatedUser);
    setTenantUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
  };

  const handleApproveTenantRequest = (requestId: string) => {
    if (!currentUser || !hasPermission(currentUser, 'admin:manage')) return;
    setTenantRequests((prev) =>
      prev.map((request) => (request.id === requestId ? { ...request, status: 'approved' } : request))
    );
  };

  const renderActiveView = () => {
    if (!currentUser) return null;

    const canManageProperties = hasPermission(currentUser, 'properties:manage');
    const canManageUnits = hasPermission(currentUser, 'units:manage');
    const canManageExpenses = hasPermission(currentUser, 'expenses:manage');
    const canManageRules = hasPermission(currentUser, 'rules:manage');
    const canPublishStatements = hasPermission(currentUser, 'statements:publish');
    const canManageIssues = hasPermission(currentUser, 'issues:manage');
    const canReconcileBank = hasPermission(currentUser, 'bank:reconcile');
    const canManageDocuments = hasPermission(currentUser, 'docs:manage');

    switch (activeTab) {
      case 'admin':
        return (
          <AdminConsoleView
            currentUser={currentUser}
            users={tenantUsers.filter((user) => user.tenantId === currentUser.tenantId)}
            tenantRequests={tenantRequests}
            onInviteUser={handleInviteUser}
            onUpdateUser={handleUpdateTenantUser}
            onApproveTenantRequest={handleApproveTenantRequest}
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
            onDeleteExpense={handleDeleteExpense}
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
            rules={rules}
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
            expenses={visibleExpenses}
            rules={rules}
            onPublishPeriod={handlePublishPeriod}
            onSelectPropertyPrompt={handleSelectPropertyPrompt}
            canPublishStatements={canPublishStatements}
          />
        );
      case 'issues':
        return (
          <IssuesView
            selectedProperty={scopedSelectedProperty}
            issues={visibleIssues}
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

  if (!currentUser) {
    return <LoginView onAuthenticated={setCurrentUser} />;
  }

  return (
    <div id="hpm-app-layout" className="min-h-screen pl-64 font-sans bg-surface text-on-surface">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        brandName="Atlas PM"
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
          onLogout={handleLogout}
          onOpenProfile={() => setActiveTab('profile')}
        />

        {/* Dashboard inner content */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {(currentUser.role === 'owner' || currentUser.role === 'resident') && (
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
