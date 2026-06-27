export const translations = {
  'nav.dashboard': { el: 'Επισκόπηση', en: 'Dashboard' },
  'nav.admin': { el: 'Διαχείριση ομάδας', en: 'Team administration' },
  'nav.properties': { el: 'Πολυκατοικίες', en: 'Properties' },
  'nav.units': { el: 'Μονάδες & Χιλιοστά', en: 'Units & shares' },
  'nav.expenses': { el: 'Έξοδα & Δαπάνες', en: 'Expenses' },
  'nav.rules': { el: 'Κανόνες Κατανομής', en: 'Distribution rules' },
  'nav.statements': { el: 'Κοινόχρηστα', en: 'Statements' },
  'nav.invoicing': { el: 'Παραστατικά AADE', en: 'AADE invoices' },
  'nav.assemblies': { el: 'Γενικές Συνελεύσεις', en: 'Assemblies' },
  'nav.issues': { el: 'Βλάβες & Συντήρηση', en: 'Issues & maintenance' },
  'nav.bank': { el: 'Τραπεζικό Καθολικό', en: 'Payment ledger' },
  'nav.docs': { el: 'Ψηφιακό Αρχείο', en: 'Documents' },
  'nav.profile': { el: 'Το Προφίλ μου', en: 'My profile' },
  'header.property': { el: 'Επιλογή Κτιρίου', en: 'Choose property' },
  'header.language': { el: 'Γλώσσα', en: 'Language' },
  'common.demo': { el: 'Λειτουργία επίδειξης', en: 'Demo mode' }
} as const;

export type TranslationKey = keyof typeof translations;
