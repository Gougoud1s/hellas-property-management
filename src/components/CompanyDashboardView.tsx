import { ArrowRight, Check, Circle, AlertTriangle } from 'lucide-react';
import { AccountNotice, DistributionRule, Expense, Property, Unit } from '../types';
import { ActiveTab } from './Sidebar';

interface Props {
  property: Property | null;
  units: Unit[];
  expenses: Expense[];
  rules: DistributionRule[];
  notices: AccountNotice[];
  onNavigate: (tab: ActiveTab, focus?: 'issuance' | 'notices') => void;
}

export default function CompanyDashboardView({ property, units, expenses, rules, notices, onNavigate }: Props) {
  if (!property) return <div className="rounded-xl border border-dashed border-outline p-10 text-center">Επιλέξτε μία πολυκατοικία για να ξεκινήσετε.</div>;
  const propertyExpenses = expenses.filter((item) => item.propertyId === property.id);
  const verified = propertyExpenses.filter((item) => item.status === 'Verified');
  const categories = new Set(verified.map((item) => item.category));
  const configuredCategories = new Set(rules.filter((item) => item.propertyId === property.id).map((item) => item.category));
  const missingRules = [...categories].filter((category) => !configuredCategories.has(category));
  const propertyNotices = notices.filter((item) => item.propertyId === property.id && item.period === property.period);
  const steps: Array<{ label: string; detail: string; description: string; done: boolean; blocked?: boolean; tab: ActiveTab; focus?: 'issuance' | 'notices' }> = [
    { label: 'Καταχώριση δαπανών', detail: `${propertyExpenses.length} δαπάνες στην περίοδο`, description: 'Προσθέστε λογαριασμούς, παραστατικά και δαπάνες που προέκυψαν από τεχνικές εργασίες.', done: propertyExpenses.length > 0, tab: 'expenses' },
    { label: 'Έλεγχος παραστατικών', detail: `${verified.length}/${propertyExpenses.length} επαληθευμένα`, description: 'Επιβεβαιώστε προμηθευτή, ποσό και ημερομηνία. Μόνο οι επαληθευμένες δαπάνες συμμετέχουν στην έκδοση.', done: propertyExpenses.length > 0 && verified.length === propertyExpenses.length, tab: 'expenses' },
    { label: 'Κανόνες κατανομής', detail: missingRules.length ? `${missingRules.length} κατηγορίες χωρίς κανόνα` : 'Όλες οι κατηγορίες έχουν κανόνα', description: 'Ορίστε πώς μοιράζεται κάθε κατηγορία: χιλιοστά, ίσα μέρη, εμβαδόν ή αριθμός ατόμων.', done: categories.size > 0 && missingRules.length === 0, blocked: missingRules.length > 0, tab: 'rules' },
    { label: 'Έκδοση κοινοχρήστων', detail: property.status === 'Published' ? 'Η περίοδος εκδόθηκε' : 'Αναμένει τελικό έλεγχο', description: 'Ελέγξτε τα ποσά ανά μονάδα και οριστικοποιήστε την περίοδο. Τότε οι λογαριασμοί θεωρούνται επίσημοι.', done: property.status === 'Published', blocked: missingRules.length > 0 || verified.length === 0, tab: 'statements', focus: 'issuance' },
    { label: 'Αποστολή ειδοποιητηρίων', detail: `${propertyNotices.length}/${units.length} δημιουργήθηκαν`, description: 'Στείλτε το ειδοποιητήριο κάθε μονάδας και παρακολουθήστε την κατάστασή του ξεχωριστά από την έκδοση.', done: units.length > 0 && propertyNotices.length >= units.length, blocked: property.status !== 'Published', tab: 'statements', focus: 'notices' },
    { label: 'Συμφωνία πληρωμών', detail: 'Έλεγχος εισπράξεων και εκκρεμοτήτων', description: 'Αντιστοιχίστε τραπεζικές κινήσεις με μονάδες και ελέγξτε ποια υπόλοιπα παραμένουν ανεξόφλητα.', done: property.dues <= 0, tab: 'bank' },
  ];
  const next = steps.find((step) => !step.done && !step.blocked) ?? steps.find((step) => !step.done);
  const completed = steps.filter((step) => step.done).length;

  return <div className="space-y-6">
    <section className="rounded-2xl bg-primary px-6 py-7 text-white sm:px-8">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#90d2da]">Καθημερινές εργασίες</div>
      <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-2xl font-black sm:text-3xl">{property.name}</h1><p className="mt-2 text-sm text-white/70">{property.period} · {completed}/{steps.length} βήματα ολοκληρώθηκαν</p></div>
        {next && <button onClick={() => onNavigate(next.tab, next.focus)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#90d2da] px-5 text-sm font-black text-primary">Επόμενο: {next.label}<ArrowRight size={16}/></button>}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#90d2da] transition-all" style={{width:`${(completed / steps.length) * 100}%`}} /></div>
    </section>

    <section className="overflow-hidden rounded-xl border border-outline-variant bg-white">
      <header className="border-b border-outline-variant px-5 py-4"><h2 className="font-black text-primary">Μηνιαία ροή κοινοχρήστων</h2><p className="mt-1 text-sm text-outline">Ακολουθήστε τα βήματα με τη σειρά. Το σύστημα επισημαίνει τι λείπει.</p></header>
      <div className="divide-y divide-outline-variant/50">{steps.map((step, index) => <button key={step.label} onClick={() => onNavigate(step.tab, step.focus)} className="flex min-h-[92px] w-full items-center gap-4 px-5 py-4 text-left hover:bg-surface-container-low">
        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${step.done ? 'bg-emerald-100 text-emerald-700' : step.blocked ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>{step.done ? <Check size={17}/> : step.blocked ? <AlertTriangle size={16}/> : <Circle size={15}/>}</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-black text-on-surface">{index + 1}. {step.label}</span><span className="mt-1 block text-xs font-semibold text-primary/75">{step.detail}</span><span className="mt-1 block text-xs leading-5 text-outline">{step.description}</span></span>
        <ArrowRight className="h-4 w-4 flex-none text-outline" />
      </button>)}</div>
    </section>
  </div>;
}
