import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, X } from 'lucide-react';
import { AuthUser } from '../lib/auth';
import { ActiveTab } from './Sidebar';

export const TOUR_VERSION = 'workflow-v1';

type TourStep = { tab: ActiveTab; focus?: 'issuance' | 'notices'; eyebrow: string; title: string; body: string };

const companySteps: TourStep[] = [
  { tab: 'dashboard', eyebrow: 'Η καθημερινή αφετηρία', title: 'Η ροή εργασίας σας', body: 'Εδώ βλέπετε τι ολοκληρώθηκε, τι εμποδίζει την έκδοση και ποια είναι η επόμενη προτεινόμενη ενέργεια.' },
  { tab: 'properties', eyebrow: 'Βήμα 1', title: 'Επιλέξτε πολυκατοικία', body: 'Κάθε εργασία εκτελείται μέσα στο επιλεγμένο κτίριο. Μπορείτε επίσης να αλλάξετε κτίριο από την επάνω μπάρα.' },
  { tab: 'expenses', eyebrow: 'Βήμα 2', title: 'Καταχωρίστε και ελέγξτε δαπάνες', body: 'Προσθέστε παραστατικά και επαληθεύστε τα. Οι ολοκληρωμένες τεχνικές βλάβες δημιουργούν αυτόματα πρόχειρη δαπάνη εδώ.' },
  { tab: 'rules', eyebrow: 'Βήμα 3', title: 'Ελέγξτε τους κανόνες κατανομής', body: 'Κάθε κατηγορία δαπάνης χρειάζεται κανόνα: χιλιοστά, ίση κατανομή, εμβαδόν ή αριθμό ατόμων.' },
  { tab: 'statements', focus: 'issuance', eyebrow: 'Βήμα 4', title: 'Εκδώστε τα κοινόχρηστα', body: 'Κάντε τον τελικό έλεγχο των ποσών ανά μονάδα και οριστικοποιήστε την περίοδο. Αυτό το βήμα δημιουργεί τους επίσημους λογαριασμούς.' },
  { tab: 'statements', focus: 'notices', eyebrow: 'Βήμα 5', title: 'Στείλτε τα ειδοποιητήρια', body: 'Μεταβείτε απευθείας στον πίνακα μονάδων, δημιουργήστε τα ειδοποιητήρια και ελέγξτε ξεχωριστά ποια στάλθηκαν ή απέτυχαν.' },
  { tab: 'bank', eyebrow: 'Βήμα 6', title: 'Συμφωνήστε τις πληρωμές', body: 'Αντιστοιχίστε κάθε τραπεζική κίνηση με τη σωστή μονάδα. Το υπόλοιπο, το διαθέσιμο ταμείο και το καθολικό ενημερώνονται μαζί.' },
  { tab: 'issues', eyebrow: 'Παράλληλη εργασία', title: 'Διαχειριστείτε συντήρηση και βλάβες', body: 'Παρακολουθήστε ανάθεση, πρόοδο και κόστος. Με την ολοκλήρωση, η δαπάνη περνά για οικονομικό έλεγχο.' },
];

const portalSteps: TourStep[] = [
  { tab: 'dashboard', eyebrow: 'Καλώς ήρθατε', title: 'Η προσωπική σας εικόνα', body: 'Βλέπετε τις μονάδες, τις οφειλές και τις πρόσφατες ενέργειες που αφορούν μόνο τον λογαριασμό σας.' },
  { tab: 'statements', eyebrow: 'Κοινόχρηστα', title: 'Λογαριασμοί και ανάλυση', body: 'Δείτε τις χρεώσεις της περιόδου και τον τρόπο με τον οποίο υπολογίστηκε το ποσό σας.' },
  { tab: 'bank', eyebrow: 'Πληρωμές', title: 'Ιστορικό εισπράξεων', body: 'Οι ιδιοκτήτες μπορούν να βλέπουν τις πληρωμές και την ενημέρωση του υπολοίπου τους.' },
  { tab: 'issues', eyebrow: 'Υποστήριξη', title: 'Βλάβες και αιτήματα', body: 'Παρακολουθήστε την κατάσταση ενός τεχνικού αιτήματος που αφορά το κτίριο ή τη μονάδα σας.' },
];

interface Props { user: AuthUser; open: boolean; onClose: (completed: boolean) => void; onNavigate: (tab: ActiveTab, focus?: 'issuance' | 'notices') => void; }

export default function GuidedTour({ user, open, onClose, onNavigate }: Props) {
  const [index, setIndex] = useState(0);
  const steps = useMemo(() => user.role === 'owner' || user.role === 'resident' ? portalSteps : companySteps, [user.role]);
  useEffect(() => { if (open) { setIndex(0); onNavigate(steps[0].tab, steps[0].focus); } }, [open, onNavigate, steps]);
  if (!open) return null;
  const step = steps[index];
  const go = (next: number) => { setIndex(next); onNavigate(steps[next].tab, steps[next].focus); };
  const finish = () => onClose(true);

  return <div className="fixed inset-0 z-[100] bg-primary/25 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
    <div className="absolute inset-x-4 bottom-4 mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl sm:bottom-8">
      <div className="h-1 bg-surface-container"><div className="h-full bg-secondary transition-all duration-300" style={{width:`${((index + 1) / steps.length) * 100}%`}} /></div>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-white"><Compass size={19}/></span>
          <div className="min-w-0 flex-1"><div className="text-[11px] font-black uppercase tracking-[0.15em] text-secondary">{step.eyebrow} · {index + 1}/{steps.length}</div><h2 id="tour-title" className="mt-1 text-xl font-black text-primary">{step.title}</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">{step.body}</p></div>
          <button onClick={() => onClose(false)} className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-outline hover:bg-surface-container" aria-label="Παράλειψη ξενάγησης"><X size={19}/></button>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
          <button disabled={index === 0} onClick={() => go(index - 1)} className="flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold text-primary disabled:invisible"><ArrowLeft size={16}/>Πίσω</button>
          {index < steps.length - 1 ? <button onClick={() => go(index + 1)} className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white">Επόμενο<ArrowRight size={16}/></button> : <button onClick={finish} className="flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-black text-white"><Check size={16}/>Ολοκλήρωση</button>}
        </div>
      </div>
    </div>
  </div>;
}
