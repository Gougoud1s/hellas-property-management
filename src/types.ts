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
