/**
 * Hellas Property Management - Shared Types & Local Persistence State
 * All Greek labels and hotlinked images from mockups are preserved exactly.
 */

export interface Property {
  id: string;
  tenantId?: string;
  name: string;
  address: string;
  unitsCount: number;
  period: string;
  status: 'Draft' | 'Published';
  dues: number;
  issuesCount: number;
  imageUrl: string;
  occupancy: number; // percentage
}

export interface Unit {
  id: string; // A1, B1, etc.
  tenantId?: string;
  propertyId?: string;
  floor: string; // 1ος, 2ος, 3ος, Ισόγειο
  type: string; // Διαμέρισμα, Parking, Αποθήκη
  size: number; // m²
  share: number; // millesimal share e.g. 120.00
  coefficient: number; // e.g. 1.00
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  residentName: string;
  residentType: 'Ιδιοκατοίκηση' | 'Ενοικιαστής' | 'Κενό';
  status: 'Ενεργό' | 'Κενό';
  balance: number;
  prevBalance: number;
  deposit: number; // Αποθεματικό
}

export interface Expense {
  id: string;
  tenantId?: string;
  propertyId?: string;
  date: string;
  supplier: string;
  category: string;
  amount: number;
  fileName?: string;
  status: 'Verified' | 'Draft';
}

export interface DistributionRule {
  tenantId?: string;
  propertyId?: string;
  category: string;
  method: 'Χιλιοστά' | 'Ισομερής Κατανομή' | 'Βάσει Εμβαδού' | 'Βάσει Ατόμων';
  sampleAmount: number;
  description: string;
}

export interface Issue {
  id: string;
  tenantId?: string;
  propertyId?: string;
  unitId?: string;
  title: string;
  property: string;
  severity: 'High' | 'Medium' | 'Low' | 'Urgent';
  status: 'New' | 'Under Inspection' | 'Assigned' | 'In Progress' | 'Resolved';
  reportedAt: string;
  estimate: number;
  technician?: string;
  technicianImg?: string;
  progress?: number; // percentage
  invoiceNum?: string;
}

export interface BankTransaction {
  id: string;
  tenantId?: string;
  propertyId?: string;
  date: string;
  amount: number;
  bank: string;
  ref: string;
  description: string;
  suggestedUnit?: string;
  suggestedOwner?: string;
}

export interface PaymentLedger {
  id: string;
  tenantId?: string;
  propertyId?: string;
  date: string;
  payer: string;
  unit: string;
  paymentCode: string;
  amount: number;
  method: 'Τράπεζα' | 'Μετρητά';
  matchType: 'ΑΥΤΟΜΑΤΗ' | 'ΧΕΙΡΟΚΙΝΗΤΗ' | 'ΕΚΚΡΕΜΕΙ';
  status: 'Ολοκληρώθηκε' | 'Υπό έγκριση' | 'Προτεινόμενο Match';
}

export interface Document {
  id: string;
  tenantId?: string;
  propertyId?: string;
  name: string;
  date: string;
  type: 'Σύμβαση' | 'Παραστατικό' | 'Πρακτικά' | 'Τεχνικό';
  property: string;
  visibility: 'Μόνο Εταιρεία' | 'Ιδιοκτήτες' | 'Όλοι';
  size: string;
}

export interface TenantRegistrationRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  propertiesEstimate: number;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Tenant taxonomy. A tenant is either a Properties Management Company or an
 * Individual Property Manager.
 */
export type TenantType = 'company' | 'individual';

/** Means-of-contact channel type. */
export type MocType = 'landline' | 'mobile' | 'email' | 'other';

/** How an Individual Property Manager subscribed to the platform. */
export type IndividualSignupMethod = 'email' | 'google' | 'facebook' | 'apple';

/** Stage of a Properties Management Company in the onboarding pipeline. */
export type PmcOnboardingStage = 'request' | 'approved' | 'agreement_signed' | 'admin_provisioned';

/** Means of Contact — a single phone/email/other channel. Table: **MOCs**. */
export interface MeansOfContact {
  id: string;
  type: MocType;
  value: string;
  /** When true, this channel is surfaced to the tenant's properties/residents. */
  availableToProperties: boolean;
}

/** A contact person for a tenant, holding one or more MOCs. Table: **Contacts**. */
export interface TenantContact {
  id: string;
  fullName: string;
  mocs: MeansOfContact[];
}

/** Platform subscriber. Table: **Tenants**. */
export interface Tenant {
  id: string;
  companyName: string;
  /** Greek VAT / ΑΦΜ, stored canonically as "EL" + 9 digits. */
  vatNumber: string;
  profession: string;
  address: string;
  zipCode: string;
  contacts: TenantContact[];
  /** Logo stored as a BLOB in the DB; a URL or data-URI in the client. */
  logoUrl?: string;
  websiteUrl?: string;
  tenantType: TenantType;
  isActive: boolean;
  isDeleted: boolean;
  /** Individual PM: identity provider used to subscribe (supplementary). */
  signupMethod?: IndividualSignupMethod;
  /** PMC: onboarding pipeline stage (supplementary). */
  onboardingStage?: PmcOnboardingStage;
}

// --- Platform subscriptions -------------------------------------------------

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface SubscriptionPlanInfo {
  label: string;
  pricePerMonth: number;
  /** Max managed properties; null = unlimited. */
  propertiesLimit: number | null;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanInfo> = {
  starter: {
    label: 'Starter',
    pricePerMonth: 49,
    propertiesLimit: 5,
    features: ['Έως 5 πολυκατοικίες', 'Κοινόχρηστα & πληρωμές', 'Email υποστήριξη']
  },
  professional: {
    label: 'Professional',
    pricePerMonth: 149,
    propertiesLimit: 25,
    features: ['Έως 25 πολυκατοικίες', 'Παραστατικά ΑΑΔΕ', 'Τραπεζική συμφωνία', 'Προτεραιότητα υποστήριξης']
  },
  enterprise: {
    label: 'Enterprise',
    pricePerMonth: 399,
    propertiesLimit: null,
    features: ['Απεριόριστες πολυκατοικίες', 'API πρόσβαση', 'SSO', 'Αποκλειστικός account manager']
  }
};

/** A tenant's subscription to the platform. Table: **Subscriptions**. */
export interface TenantSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  seats: number;
  /** Renewal date, dd/mm/yyyy. */
  renewalDate: string;
}

// --- Property-management settings -------------------------------------------

/** Organisation-wide property-management settings. Table: **PMSettings**. */
export interface PmSettings {
  organizationName: string;
  defaultCurrency: string;
  vatPercentage: number;
  lateFeePercentage: number;
  paymentTermsDays: number;
  reserveFundPercentage: number;
  invoicePrefix: string;
  fiscalYearStartMonth: number;
  notifyByEmail: boolean;
  notifyBySms: boolean;
}

// Initial Mock Data matching the Greek mockup screens
export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'ATH-0226',
    tenantId: 'tenant-hellas-pm',
    name: 'Athenian Court',
    address: 'Λεωφ. Κηφισίας 124, Αθήνα',
    unitsCount: 24,
    period: 'Ιούνιος 2026',
    status: 'Draft',
    dues: 2450.00,
    issuesCount: 2,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMX7yo9BrjP_os2a0HHN8h25V-Fl19gQETGHgs0QPj2xlxqN4r-IhRhuZezdBdPLhuSy3AfLEpgSY_0-QFNS0AlP7HWzAyJfT5eG5wbqc-wb4McvXqs0m47VporD6P5bdvgkPSTrVhe1FL2oMskGFtR6G55ppU9wZQDFTiUSYXXaLnuqfisWJFCJ1h0LLNeX4KCagZmFnDsQc1GUTd7Q05FBBXaVVCKpnv0m4RWfFcl--_INejTCKeVJdOjzF9Du3YpdNOy3RAwOk',
    occupancy: 100
  },
  {
    id: 'MAR-0118',
    tenantId: 'tenant-hellas-pm',
    name: 'Marina Residences',
    address: 'Ποσειδώνος 45, Γλυφάδα',
    unitsCount: 18,
    period: 'Ιούνιος 2026',
    status: 'Published',
    dues: 420.00,
    issuesCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    occupancy: 94
  },
  {
    id: 'PEF-0332',
    tenantId: 'tenant-hellas-pm',
    name: 'Pefki Heights',
    address: 'Αγίου Όρους 12, Πεύκη',
    unitsCount: 32,
    period: 'Ιούνιος 2026',
    status: 'Published',
    dues: 1120.50,
    issuesCount: 1,
    imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
    occupancy: 100
  },
  {
    id: 'PAN-0412',
    tenantId: 'tenant-north-pm',
    name: 'Panorama Plaza',
    address: 'Β. Όλγας 210, Θεσσαλονίκη',
    unitsCount: 12,
    period: 'Μάιος 2026',
    status: 'Published',
    dues: 0.00,
    issuesCount: 1,
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    occupancy: 83
  },
  {
    id: 'CEN-0540',
    tenantId: 'tenant-hellas-pm',
    name: 'Central Square',
    address: 'Πανεπιστημίου 18, Αθήνα',
    unitsCount: 40,
    period: 'Ιούνιος 2026',
    status: 'Draft',
    dues: 5890.00,
    issuesCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1554435493-93422e8220c8?auto=format&fit=crop&w=800&q=80',
    occupancy: 90
  }
];

export const INITIAL_UNITS: Unit[] = [
  {
    id: 'A1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    floor: '1ος',
    type: 'Διαμέρισμα',
    size: 85.40,
    share: 120.00,
    coefficient: 1.00,
    ownerName: 'Παπαδόπουλος Ιωάννης',
    ownerPhone: '210-98213XX',
    ownerEmail: 'i.papadopoulos@email.gr',
    residentName: 'Παπαδόπουλος Ι.',
    residentType: 'Ιδιοκατοίκηση',
    status: 'Ενεργό',
    balance: 124.50,
    prevBalance: 0.00,
    deposit: 250.00
  },
  {
    id: 'A2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    floor: '1ος',
    type: 'Διαμέρισμα',
    size: 85.40,
    share: 120.00,
    coefficient: 1.00,
    ownerName: 'Παππάς Νικόλαος',
    ownerPhone: '210-91123XX',
    ownerEmail: 'n.pappas@email.com',
    residentName: 'Παππάς Νικόλαος',
    residentType: 'Ιδιοκατοίκηση',
    status: 'Ενεργό',
    balance: 0.00,
    prevBalance: 0.00,
    deposit: 250.00
  },
  {
    id: 'B1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    floor: '2ος',
    type: 'Διαμέρισμα',
    size: 85.40,
    share: 120.00,
    coefficient: 1.00,
    ownerName: 'Καραμανλή Ελένη',
    ownerPhone: '210-94432XX',
    ownerEmail: 'e.kar@email.com',
    residentName: 'Νικολάου Ανδρέας',
    residentType: 'Ενοικιαστής',
    status: 'Ενεργό',
    balance: 270.40,
    prevBalance: 150.00,
    deposit: 250.00
  },
  {
    id: 'B2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    floor: '2ος',
    type: 'Διαμέρισμα',
    size: 95.00,
    share: 180.00,
    coefficient: 1.00,
    ownerName: 'Βασιλείου Γεώργιος',
    residentName: 'Βασιλείου Γ.',
    residentType: 'Ιδιοκατοίκηση',
    status: 'Ενεργό',
    balance: 0.00,
    prevBalance: 0.00,
    deposit: 300.00
  },
  {
    id: 'C1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    floor: '3ος',
    type: 'Διαμέρισμα',
    size: 110.00,
    share: 250.00,
    coefficient: 1.00,
    ownerName: 'Δημητρίου Φώτιος',
    residentName: '',
    residentType: 'Κενό',
    status: 'Κενό',
    balance: 42.50,
    prevBalance: 0.00,
    deposit: 350.00
  },
  {
    id: 'C2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    floor: '3ος',
    type: 'Διαμέρισμα',
    size: 120.00,
    share: 330.00,
    coefficient: 1.00,
    ownerName: 'Κώστα Ελένη',
    residentName: 'Κώστα Ελένη',
    residentType: 'Ιδιοκατοίκηση',
    status: 'Ενεργό',
    balance: 44.80,
    prevBalance: 0.00,
    deposit: 380.00
  },
  {
    id: 'P1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    floor: 'Ισόγειο',
    type: 'Parking',
    size: 12.50,
    share: 0.00,
    coefficient: 1.00,
    ownerName: 'Παπαδόπουλος Ιωάννης',
    residentName: '',
    residentType: 'Κενό',
    status: 'Ενεργό',
    balance: 0.00,
    prevBalance: 0.00,
    deposit: 0.00
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '12/06/2026',
    supplier: 'CleanX',
    category: 'Καθαριότητα',
    amount: 240.00,
    fileName: 'clean_inv_12.pdf',
    status: 'Verified'
  },
  {
    id: 'exp-2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '15/06/2026',
    supplier: 'LiftService',
    category: 'Συντήρηση Ασανσέρ',
    amount: 180.00,
    status: 'Draft'
  },
  {
    id: 'exp-3',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '18/06/2026',
    supplier: 'Κηπουρός (Papadakis)',
    category: 'Κηπουρός',
    amount: 120.00,
    fileName: 'rec_gard_06.jpg',
    status: 'Verified'
  }
];

export const INITIAL_RULES: DistributionRule[] = [
  {
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    category: 'Γενικά',
    method: 'Χιλιοστά',
    sampleAmount: 100.00,
    description: 'Οι γενικές δαπάνες κατανέμονται αναλογικά σε όλα τα διαμερίσματα βάσει των γενικών χιλιοστών συνδιοκτησίας.'
  },
  {
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    category: 'Ασανσέρ',
    method: 'Χιλιοστά',
    sampleAmount: 100.00,
    description: 'Η δαπάνη Ασανσέρ κατανέμεται αναλογικά στις συμμετέχουσες μονάδες βάσει των καταχωρημένων χιλιοστών. Οι μονάδες ισογείου εξαιρούνται βάσει καταστατικού.'
  },
  {
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    category: 'Θέρμανση',
    method: 'Βάσει Εμβαδού',
    sampleAmount: 450.00,
    description: 'Οι δαπάνες θέρμανσης κατανέμονται βάσει των ωφέλιμων τετραγωνικών μέτρων κάθε θερμαινόμενης μονάδας και των συντελεστών απωλειών.'
  },
  {
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    category: 'Πισίνα',
    method: 'Ισομερής Κατανομή',
    sampleAmount: 200.00,
    description: 'Οι δαπάνες πισίνας κατανέμονται εξίσου σε όλα τα ενεργά διαμερίσματα που έχουν δικαίωμα πρόσβασης στις εγκαταστάσεις.'
  },
  {
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    category: 'Κήπος',
    method: 'Χιλιοστά',
    sampleAmount: 150.00,
    description: 'Οι κηπουρικές εργασίες κατανέμονται αναλογικά σε όλα τα διαμερίσματα βάσει των γενικών χιλιοστών.'
  },
  {
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    category: 'Καθαριότητα',
    method: 'Βάσει Ατόμων',
    sampleAmount: 180.00,
    description: 'Οι δαπάνες καθαρισμού κοινόχρηστων χώρων κατανέμονται ανάλογα με τον αριθμό των μόνιμων κατοίκων κάθε διαμερίσματος.'
  }
];

export const INITIAL_ISSUES: Issue[] = [
  {
    id: 'issue-1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    title: 'Διαρροή στον κήπο',
    property: 'Athenian Court',
    severity: 'High',
    status: 'New',
    reportedAt: 'Πριν από 2 ώρες',
    estimate: 150.00,
    technician: 'Garden Solutions',
    technicianImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCZYt63fIjFuXyzyy8Z-abZn7QxOIH7pS45ESGVBVG_5An76gnDzOSy6Kgt_7GAXHwqc07mXVOKOMWdCNi4czqNZr2un_QBC8V5R7lbZjxysOY5aJytfuUpcJhR7yhRGk1Fy7Bxb3kjipC38Dlw43i9-zpmwm8GtTGNU5MByNSDtv8Pg1wCowIaH794f4p8eWm55-A9lqDQ9zKrQCvywyyGxnPwBlJTnQDAX6zPQj9NbGk5n-0g8t7QL1kowCBLmIeMJOHqvcCkzI'
  },
  {
    id: 'issue-2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    title: 'Καμένο φως κλιμακοστασίου',
    property: 'Athenian Court',
    severity: 'Medium',
    status: 'New',
    reportedAt: 'Πριν από 5 ώρες',
    estimate: 45.00
  },
  {
    id: 'issue-3',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    title: 'Βλάβη στον Ανελκυστήρα',
    property: 'Athenian Court',
    severity: 'High',
    status: 'Under Inspection',
    reportedAt: 'Πριν από 1 μέρα',
    estimate: 180.00,
    technician: 'Lift-Tech SA'
  },
  {
    id: 'issue-4',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'MAR-0118',
    title: 'Κούρεμα γκαζόν',
    property: 'Marina Residences',
    severity: 'Low',
    status: 'Assigned',
    reportedAt: 'Αύριο 09:00',
    estimate: 80.00,
    technician: 'Garden Solutions'
  },
  {
    id: 'issue-5',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    unitId: 'B1',
    title: 'Απόφραξη κεντρικής στήλης',
    property: 'Athenian Court',
    severity: 'Urgent',
    status: 'In Progress',
    reportedAt: 'Σε εξέλιξη (1ω)',
    estimate: 220.00,
    technician: 'Papamichael Plumbing',
    progress: 65
  },
  {
    id: 'issue-6',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'PEF-0332',
    title: 'Επισκευή θυροτηλεφώνου',
    property: 'Pefki Heights',
    severity: 'Medium',
    status: 'Resolved',
    reportedAt: 'Resolved',
    estimate: 150.00,
    invoiceNum: '#INV-4921'
  }
];

export const INITIAL_BANK_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'bank-1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '22/06/2026',
    amount: 124.50,
    bank: 'ALPHA BANK',
    ref: '902341XX',
    description: 'ΚΑΤΑΘΕΣΗ ΚΟΙΝΟΧΡΗΣΤΩΝ A1 PAPADOPOULOS',
    suggestedUnit: 'A1',
    suggestedOwner: 'Παπαδόπουλος Ιωάννης'
  },
  {
    id: 'bank-2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '21/06/2026',
    amount: 270.40,
    bank: 'EUROBANK',
    ref: 'EB7721',
    description: 'METAΦΟΡΑ ΚΟΙΝΟΧΡΗΣΤΩΝ B1 KARAMANLI',
    suggestedUnit: 'B1',
    suggestedOwner: 'Καραμανλή Ελένη'
  },
  {
    id: 'bank-3',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '20/06/2026',
    amount: 44.80,
    bank: 'ΠΕΙΡΑΙΩΣ',
    ref: 'PIR-552',
    description: 'ΚΟΙΝΟΧΡΗΣΤΑ ΙΟΥΝΙΟΥ C2 KOSTA',
    suggestedUnit: 'C2',
    suggestedOwner: 'Κώστα Ελένη'
  },
  {
    id: 'bank-4',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '19/06/2026',
    amount: 320.00,
    bank: 'ΕΘΝΙΚΗ',
    ref: 'NBG-9901',
    description: 'METAΦΟΡΑ ΕΝΑΝΤΙ ΚΟΙΝΟΧΡΗΣΤΩΝ'
  }
];

export const INITIAL_PAYMENT_LEDGER: PaymentLedger[] = [
  {
    id: 'pay-1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '20/06/2026',
    payer: 'Νικόλαος Σταύρου',
    unit: 'A1',
    paymentCode: 'PYM-8822-X1',
    amount: 245.50,
    method: 'Τράπεζα',
    matchType: 'ΑΥΤΟΜΑΤΗ',
    status: 'Ολοκληρώθηκε'
  },
  {
    id: 'pay-2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '19/06/2026',
    payer: 'Ελένη Κώστα',
    unit: 'B1',
    paymentCode: 'PYM-7712-B2',
    amount: 120.00,
    method: 'Μετρητά',
    matchType: 'ΧΕΙΡΟΚΙΝΗΤΗ',
    status: 'Υπό έγκριση'
  },
  {
    id: 'pay-3',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    date: '18/06/2026',
    payer: 'Ανώνυμος (Κωδ. 9023)',
    unit: 'UNKNOWN',
    paymentCode: 'UNKNOWN',
    amount: 150.00,
    method: 'Τράπεζα',
    matchType: 'ΕΚΚΡΕΜΕΙ',
    status: 'Προτεινόμενο Match'
  }
];

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    name: 'Συμβόλαιο Ανελκυστήρα 2026',
    date: '12/05/2026',
    type: 'Σύμβαση',
    property: 'Athenian Court',
    visibility: 'Μόνο Εταιρεία',
    size: '1.2 MB'
  },
  {
    id: 'doc-2',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    name: 'Τιμολόγιο ΕΥΔΑΠ - Ιούνιος 2026',
    date: '05/06/2026',
    type: 'Παραστατικό',
    property: 'Athenian Court',
    visibility: 'Ιδιοκτήτες',
    size: '420 KB'
  },
  {
    id: 'doc-3',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    name: 'Πρακτικά Γενικής Συνέλευσης',
    date: '28/05/2026',
    type: 'Πρακτικά',
    property: 'Athenian Court',
    visibility: 'Όλοι',
    size: '2.4 MB'
  },
  {
    id: 'doc-4',
    tenantId: 'tenant-hellas-pm',
    propertyId: 'ATH-0226',
    name: 'Τεχνική Μελέτη Θέρμανσης',
    date: '15/04/2026',
    type: 'Τεχνικό',
    property: 'Athenian Court',
    visibility: 'Μόνο Εταιρεία',
    size: '5.8 MB'
  }
];

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'ten-1',
    companyName: 'Athens Blocks ΙΚΕ',
    vatNumber: 'EL094512378',
    profession: 'Διαχείριση Ακινήτων',
    address: 'Λεωφ. Κηφισίας 124',
    zipCode: '11526',
    tenantType: 'company',
    isActive: true,
    isDeleted: false,
    onboardingStage: 'admin_provisioned',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=128&q=80',
    websiteUrl: 'https://athensblocks.gr',
    contacts: [
      {
        id: 'ct-1a',
        fullName: 'Σοφία Κωνσταντίνου',
        mocs: [
          { id: 'moc-1a1', type: 'landline', value: '2105533000', availableToProperties: true },
          { id: 'moc-1a2', type: 'mobile', value: '6974818213', availableToProperties: true },
          { id: 'moc-1a3', type: 'email', value: 'info@athensblocks.gr', availableToProperties: true }
        ]
      },
      {
        id: 'ct-1b',
        fullName: 'Νίκος Ιωάννου',
        mocs: [
          { id: 'moc-1b1', type: 'mobile', value: '6971110022', availableToProperties: false },
          { id: 'moc-1b2', type: 'email', value: 'accounting@athensblocks.gr', availableToProperties: false }
        ]
      }
    ]
  },
  {
    id: 'ten-2',
    companyName: 'Βασίλης Ντάλας',
    vatNumber: 'EL068094452',
    profession: 'Ιδιώτης Διαχειριστής',
    address: 'Ποσειδώνος 45',
    zipCode: '16674',
    tenantType: 'individual',
    isActive: true,
    isDeleted: false,
    signupMethod: 'google',
    contacts: [
      {
        id: 'ct-2a',
        fullName: 'Βασίλης Ντάλας',
        mocs: [
          { id: 'moc-2a1', type: 'mobile', value: '6974818213', availableToProperties: true },
          { id: 'moc-2a2', type: 'landline', value: '2294082140', availableToProperties: true },
          { id: 'moc-2a3', type: 'email', value: 'vassilisnt@gmail.com', availableToProperties: true }
        ]
      }
    ]
  },
  {
    id: 'ten-3',
    companyName: 'Marina Estate Management AE',
    vatNumber: 'EL099887761',
    profession: 'Facility Management',
    address: 'Ακτή Μιαούλη 12',
    zipCode: '18535',
    tenantType: 'company',
    isActive: false,
    isDeleted: false,
    onboardingStage: 'approved',
    logoUrl: 'https://images.unsplash.com/photo-1554435493-93422e8220c8?auto=format&fit=crop&w=128&q=80',
    websiteUrl: 'https://marinaestate.gr',
    contacts: [
      {
        id: 'ct-3a',
        fullName: 'Ελένη Παπαδάκη',
        mocs: [
          { id: 'moc-3a1', type: 'landline', value: '2104100200', availableToProperties: true },
          { id: 'moc-3a2', type: 'email', value: 'contact@marinaestate.gr', availableToProperties: true }
        ]
      }
    ]
  },
  {
    id: 'ten-4',
    companyName: 'Ελένη Καραμανλή',
    vatNumber: 'EL045662890',
    profession: 'Ιδιώτης Διαχειριστής',
    address: 'Κολοκοτρώνη 8',
    zipCode: '14562',
    tenantType: 'individual',
    isActive: true,
    isDeleted: false,
    signupMethod: 'email',
    contacts: [
      {
        id: 'ct-4a',
        fullName: 'Ελένη Καραμανλή',
        mocs: [
          { id: 'moc-4a1', type: 'mobile', value: '6944321100', availableToProperties: true },
          { id: 'moc-4a2', type: 'email', value: 'e.karamanli@email.com', availableToProperties: false }
        ]
      }
    ]
  },
  {
    id: 'ten-5',
    companyName: 'Pefki Facilities ΟΕ',
    vatNumber: 'EL084550129',
    profession: 'Συντήρηση Κτιρίων',
    address: 'Αγίου Όρους 12',
    zipCode: '15121',
    tenantType: 'company',
    isActive: false,
    isDeleted: false,
    onboardingStage: 'admin_provisioned',
    contacts: [
      {
        id: 'ct-5a',
        fullName: 'Δημήτρης Φωτίου',
        mocs: [
          { id: 'moc-5a1', type: 'landline', value: '2108020304', availableToProperties: true },
          { id: 'moc-5a2', type: 'mobile', value: '6971230000', availableToProperties: true },
          { id: 'moc-5a3', type: 'email', value: 'support@pefkifm.gr', availableToProperties: true }
        ]
      }
    ]
  },
  {
    id: 'ten-6',
    companyName: 'Γεώργιος Παπαδόπουλος',
    vatNumber: 'EL072118034',
    profession: 'Ιδιώτης Διαχειριστής',
    address: 'Ερμού 21',
    zipCode: '15124',
    tenantType: 'individual',
    isActive: true,
    isDeleted: false,
    signupMethod: 'apple',
    contacts: [
      {
        id: 'ct-6a',
        fullName: 'Γεώργιος Παπαδόπουλος',
        mocs: [
          { id: 'moc-6a1', type: 'mobile', value: '6982110045', availableToProperties: true },
          { id: 'moc-6a2', type: 'email', value: 'g.papadopoulos@email.gr', availableToProperties: true }
        ]
      }
    ]
  },
  {
    id: 'ten-7',
    companyName: 'Thessaloniki Living ΙΚΕ',
    vatNumber: 'EL091334570',
    profession: 'Διαχείριση Ακινήτων',
    address: 'Τσιμισκή 78',
    zipCode: '54622',
    tenantType: 'company',
    isActive: true,
    isDeleted: false,
    onboardingStage: 'admin_provisioned',
    logoUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=128&q=80',
    websiteUrl: 'https://thessliving.gr',
    contacts: [
      {
        id: 'ct-7a',
        fullName: 'Αναστασία Βλάχου',
        mocs: [
          { id: 'moc-7a1', type: 'landline', value: '2310555100', availableToProperties: true },
          { id: 'moc-7a2', type: 'email', value: 'hello@thessliving.gr', availableToProperties: true }
        ]
      }
    ]
  },
  {
    id: 'ten-8',
    companyName: 'Aegean Property Group AE',
    vatNumber: 'EL093770148',
    profession: 'Real Estate Management',
    address: 'Βασιλίσσης Σοφίας 60',
    zipCode: '11528',
    tenantType: 'company',
    isActive: true,
    isDeleted: false,
    onboardingStage: 'agreement_signed',
    contacts: [
      {
        id: 'ct-8a',
        fullName: 'Κωνσταντίνος Ρήγας',
        mocs: [
          { id: 'moc-8a1', type: 'landline', value: '2107011122', availableToProperties: true },
          { id: 'moc-8a2', type: 'landline', value: '2107011123', availableToProperties: false },
          { id: 'moc-8a3', type: 'email', value: 'admin@aegeanpg.gr', availableToProperties: true }
        ]
      }
    ]
  },
  {
    id: 'ten-9',
    companyName: 'Ανδρέας Νικολάου',
    vatNumber: 'EL061225509',
    profession: 'Ιδιώτης Διαχειριστής',
    address: 'Ελευθερίου Βενιζέλου 15',
    zipCode: '17121',
    tenantType: 'individual',
    isActive: false,
    isDeleted: false,
    signupMethod: 'email',
    contacts: [
      {
        id: 'ct-9a',
        fullName: 'Ανδρέας Νικολάου',
        mocs: [
          { id: 'moc-9a1', type: 'mobile', value: '6945550909', availableToProperties: true },
          { id: 'moc-9a2', type: 'other', value: 'Viber: 6945550909', availableToProperties: false }
        ]
      }
    ]
  },
  {
    id: 'ten-10',
    companyName: 'Central Square Holdings ΙΚΕ',
    vatNumber: 'EL095330217',
    profession: 'Διαχείριση Ακινήτων',
    address: 'Πανεπιστημίου 18',
    zipCode: '10679',
    tenantType: 'company',
    isActive: true,
    isDeleted: false,
    onboardingStage: 'admin_provisioned',
    logoUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=128&q=80',
    websiteUrl: 'https://centralsq.gr',
    contacts: [
      {
        id: 'ct-10a',
        fullName: 'Μαρία Αντωνίου',
        mocs: [
          { id: 'moc-10a1', type: 'landline', value: '2103322110', availableToProperties: true },
          { id: 'moc-10a2', type: 'email', value: 'ops@centralsq.gr', availableToProperties: true }
        ]
      }
    ]
  }
];

export const INITIAL_SUBSCRIPTIONS: TenantSubscription[] = [
  { id: 'sub-1', tenantId: 'ten-1', tenantName: 'Athens Blocks ΙΚΕ', plan: 'professional', status: 'active', seats: 8, renewalDate: '15/09/2026' },
  { id: 'sub-2', tenantId: 'ten-2', tenantName: 'Βασίλης Ντάλας', plan: 'starter', status: 'trial', seats: 1, renewalDate: '02/08/2026' },
  { id: 'sub-3', tenantId: 'ten-3', tenantName: 'Marina Estate Management AE', plan: 'professional', status: 'past_due', seats: 6, renewalDate: '28/06/2026' },
  { id: 'sub-4', tenantId: 'ten-4', tenantName: 'Ελένη Καραμανλή', plan: 'starter', status: 'active', seats: 1, renewalDate: '11/12/2026' },
  { id: 'sub-5', tenantId: 'ten-5', tenantName: 'Pefki Facilities ΟΕ', plan: 'starter', status: 'canceled', seats: 3, renewalDate: '05/05/2026' },
  { id: 'sub-6', tenantId: 'ten-6', tenantName: 'Γεώργιος Παπαδόπουλος', plan: 'starter', status: 'active', seats: 1, renewalDate: '20/10/2026' },
  { id: 'sub-7', tenantId: 'ten-7', tenantName: 'Thessaloniki Living ΙΚΕ', plan: 'enterprise', status: 'active', seats: 22, renewalDate: '01/03/2027' },
  { id: 'sub-8', tenantId: 'ten-8', tenantName: 'Aegean Property Group AE', plan: 'professional', status: 'active', seats: 12, renewalDate: '18/11/2026' },
  { id: 'sub-9', tenantId: 'ten-9', tenantName: 'Ανδρέας Νικολάου', plan: 'starter', status: 'trial', seats: 1, renewalDate: '30/07/2026' },
  { id: 'sub-10', tenantId: 'ten-10', tenantName: 'Central Square Holdings ΙΚΕ', plan: 'enterprise', status: 'active', seats: 30, renewalDate: '14/02/2027' }
];

export const INITIAL_PM_SETTINGS: PmSettings = {
  organizationName: 'Hellas Property Management',
  defaultCurrency: 'EUR',
  vatPercentage: 24,
  lateFeePercentage: 5,
  paymentTermsDays: 30,
  reserveFundPercentage: 10,
  invoicePrefix: 'INV-',
  fiscalYearStartMonth: 1,
  notifyByEmail: true,
  notifyBySms: false
};

// Helper to get or set state in localStorage
export function getSavedState<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save state to localStorage", e);
  }
}
