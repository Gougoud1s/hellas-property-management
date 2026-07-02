import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  UserRound
} from 'lucide-react';
import {
  AuthUser,
  DEMO_LOGIN_HINTS,
  loginWithCredentials,
  registerIndividualPropertyManager
} from '../lib/auth';
import { IndividualSignupMethod, TenantRegistrationRequest, TenantType } from '../types';

interface LoginViewProps {
  onAuthenticated: (user: AuthUser) => void;
  loginOverride?: (email: string, password: string) => Promise<AuthUser>;
  onSubmitTenantRequest?: (request: TenantRegistrationRequest) => void;
}

type Mode = 'signin' | 'subscribe';

const SOCIAL_PROVIDERS: Array<{ method: IndividualSignupMethod; label: string; badge: string; badgeClass: string }> = [
  { method: 'google', label: 'Συνέχεια με Google', badge: 'G', badgeClass: 'bg-white text-[#4285F4] border border-outline-variant' },
  { method: 'facebook', label: 'Συνέχεια με Facebook', badge: 'f', badgeClass: 'bg-[#1877F2] text-white' },
  { method: 'apple', label: 'Συνέχεια με Apple', badge: '', badgeClass: 'bg-black text-white' }
];

const PMC_STEPS = [
  { key: 'request', label: 'Υποβολή αιτήματος' },
  { key: 'approved', label: 'Έγκριση' },
  { key: 'agreement_signed', label: 'Υπογραφή σύμβασης' },
  { key: 'admin_provisioned', label: 'Δημιουργία PMC Admin' }
] as const;

export default function LoginView({ onAuthenticated, loginOverride, onSubmitTenantRequest }: LoginViewProps) {
  const [mode, setMode] = useState<Mode>('signin');

  // Sign-in state
  const [email, setEmail] = useState('admin@hellaspm.gr');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe state
  const [subKind, setSubKind] = useState<TenantType | null>(null);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');

  // PMC request form state
  const [pmc, setPmc] = useState({ companyName: '', contactName: '', email: '', phone: '', city: '', propertiesEstimate: '' });
  const [pmcSubmitted, setPmcSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (loginOverride) {
        const user = await loginOverride(email, password);
        onAuthenticated(user);
      } else {
        const result = loginWithCredentials(email, password);
        if (!result.ok || !result.user) {
          setError(result.error || 'Δεν ήταν δυνατή η σύνδεση.');
          return;
        }
        onAuthenticated(result.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Δεν ήταν δυνατή η σύνδεση.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerIndividual = (method: IndividualSignupMethod, fullName: string, userEmail: string) => {
    const user = registerIndividualPropertyManager({ fullName, email: userEmail, method });
    onAuthenticated(user);
  };

  const handleSocial = (method: IndividualSignupMethod) => {
    setRegError('');
    // Simulated provider identity (no real OAuth in demo).
    const providerName = method.charAt(0).toUpperCase() + method.slice(1);
    registerIndividual(method, `${providerName} Property Manager`, `pm.${method}@atlaspm.demo`);
  };

  const handleCreateIndividual = (event: React.FormEvent) => {
    event.preventDefault();
    if (!regName.trim() || !regEmail.trim() || regPassword.length < 6) {
      setRegError('Συμπληρώστε όνομα, email και κωδικό τουλάχιστον 6 χαρακτήρων.');
      return;
    }
    registerIndividual('email', regName.trim(), regEmail.trim());
  };

  const handlePmcSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pmc.companyName.trim() || !pmc.contactName.trim() || !pmc.email.trim()) return;
    const request: TenantRegistrationRequest = {
      id: `tenant-request-${pmc.email}`,
      companyName: pmc.companyName.trim(),
      contactName: pmc.contactName.trim(),
      email: pmc.email.trim(),
      phone: pmc.phone.trim(),
      city: pmc.city.trim(),
      propertiesEstimate: Number(pmc.propertiesEstimate) || 0,
      status: 'pending'
    };
    onSubmitTenantRequest?.(request);
    setPmcSubmitted(true);
  };

  const resetSubscribe = () => {
    setSubKind(null);
    setPmcSubmitted(false);
    setRegError('');
  };

  const inputClass =
    'w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10';

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-on-surface">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-[#004349] p-8 text-white lg:p-12">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
              <Building2 className="h-6 w-6 text-[#90d2da]" />
            </span>
            <div>
              <div className="text-lg font-extrabold tracking-wide">Atlas PM</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#90d2da]">
                B2B Portal
              </div>
            </div>
          </div>

          <div className="max-w-xl py-16">
            <p className="text-sm font-bold uppercase tracking-wide text-[#90d2da]">
              Hellas Property Management
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
              Ασφαλής πρόσβαση στο κέντρο διαχείρισης πολυκατοικιών.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
              Κοινόχρηστα, πληρωμές, βλάβες, έγγραφα και κανόνες επιμερισμού σε ένα
              εταιρικό περιβάλλον με ρόλους και ελεγχόμενη πρόσβαση.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/75 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="font-bold text-white">Tenant isolation</div>
              <div className="mt-1 text-xs">Κάθε tenant βλέπει μόνο τα δικά του δεδομένα.</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="font-bold text-white">Audit ready</div>
              <div className="mt-1 text-xs">Οι κρίσιμες οικονομικές ενέργειες καταγράφονται.</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="font-bold text-white">Greek-first</div>
              <div className="mt-1 text-xs">Ορολογία και flows για ελληνικές πολυκατοικίες.</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-6 shadow-xl lg:p-8">
            {/* Mode toggle */}
            <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                  mode === 'signin' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'
                }`}
              >
                Σύνδεση
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('subscribe');
                  resetSubscribe();
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                  mode === 'subscribe' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'
                }`}
              >
                Εγγραφή
              </button>
            </div>

            {mode === 'signin' && (
              <>
                <div className="mb-7">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-black text-primary">Σύνδεση</h2>
                  <p className="mt-2 text-sm leading-6 text-outline">
                    Χρησιμοποιήστε έναν demo λογαριασμό για να ανοίξετε το εταιρικό περιβάλλον.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Email</span>
                    <span className="relative block">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={inputClass}
                        type="email"
                        autoComplete="email"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Κωδικός</span>
                    <span className="relative block">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={inputClass}
                        type="password"
                        autoComplete="current-password"
                      />
                    </span>
                  </label>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-extrabold text-white shadow hover:bg-[#0d5c63] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Σύνδεση…' : 'Είσοδος στο Atlas PM'}
                  </button>
                </form>

                <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                  <div className="mb-3 text-xs font-black uppercase text-primary">Demo λογαριασμοί</div>
                  <div className="space-y-2">
                    {DEMO_LOGIN_HINTS.map((hint) => (
                      <button
                        key={hint.email}
                        type="button"
                        onClick={() => {
                          setEmail(hint.email);
                          setPassword(hint.password);
                          setError('');
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-xs hover:bg-primary/5"
                      >
                        <span>
                          <b className="block text-on-surface">{hint.role}</b>
                          <span className="font-mono text-outline">{hint.email}</span>
                        </span>
                        <span className="font-mono text-outline">{hint.password}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === 'subscribe' && (
              <>
                {/* Step 1 — choose tenant kind */}
                {!subKind && (
                  <>
                    <h2 className="text-2xl font-black text-primary">Εγγραφή στην πλατφόρμα</h2>
                    <p className="mt-2 text-sm leading-6 text-outline">Επιλέξτε τύπο λογαριασμού για να ξεκινήσετε.</p>

                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() => setSubKind('individual')}
                        className="flex w-full items-center gap-4 rounded-xl border border-outline-variant p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                      >
                        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                          <UserRound className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-bold text-on-surface">Ιδιώτης Διαχειριστής</span>
                          <span className="block text-xs text-outline">Άμεση εγγραφή με Email, Google, Facebook ή Apple.</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubKind('company')}
                        className="flex w-full items-center gap-4 rounded-xl border border-outline-variant p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                      >
                        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-bold text-on-surface">Εταιρεία Διαχείρισης</span>
                          <span className="block text-xs text-outline">Αίτημα → έγκριση → σύμβαση → PMC Admin λογαριασμός.</span>
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {/* Step 2a — Individual Property Manager */}
                {subKind === 'individual' && (
                  <>
                    <button onClick={resetSubscribe} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-outline hover:text-primary">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Πίσω
                    </button>
                    <h2 className="flex items-center gap-2 text-2xl font-black text-primary">
                      <UserRound className="h-6 w-6" />
                      Ιδιώτης Διαχειριστής
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-outline">Δημιουργήστε τον προσωπικό σας χώρο εργασίας.</p>

                    <div className="mt-6 space-y-2.5">
                      {SOCIAL_PROVIDERS.map((provider) => (
                        <button
                          key={provider.method}
                          type="button"
                          onClick={() => handleSocial(provider.method)}
                          className="flex w-full items-center gap-3 rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-low"
                        >
                          <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-black ${provider.badgeClass}`}>
                            {provider.badge}
                          </span>
                          {provider.label}
                        </button>
                      ))}
                    </div>

                    <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase text-outline">
                      <span className="h-px flex-1 bg-outline-variant" />
                      ή με email
                      <span className="h-px flex-1 bg-outline-variant" />
                    </div>

                    <form className="space-y-4" onSubmit={handleCreateIndividual}>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Ονοματεπώνυμο</span>
                        <span className="relative block">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                          <input value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass} autoComplete="name" />
                        </span>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Email</span>
                        <span className="relative block">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                          <input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass} type="email" autoComplete="email" />
                        </span>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Κωδικός</span>
                        <span className="relative block">
                          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                          <input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputClass} type="password" autoComplete="new-password" />
                        </span>
                      </label>

                      {regError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{regError}</div>
                      )}

                      <button type="submit" className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-extrabold text-white shadow hover:bg-[#0d5c63]">
                        Δημιουργία λογαριασμού
                      </button>
                    </form>
                  </>
                )}

                {/* Step 2b — Properties Management Company */}
                {subKind === 'company' && !pmcSubmitted && (
                  <>
                    <button onClick={resetSubscribe} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-outline hover:text-primary">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Πίσω
                    </button>
                    <h2 className="flex items-center gap-2 text-2xl font-black text-primary">
                      <Building2 className="h-6 w-6" />
                      Εταιρεία Διαχείρισης
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-outline">
                      Υποβάλετε αίτημα. Η ομάδα μας θα επικοινωνήσει για έγκριση και υπογραφή σύμβασης.
                    </p>

                    <PmcStepper current="request" />

                    <form className="mt-5 space-y-4" onSubmit={handlePmcSubmit}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Επωνυμία *</span>
                          <input value={pmc.companyName} onChange={(e) => setPmc({ ...pmc, companyName: e.target.value })} required className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm outline-none focus:border-primary" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Υπεύθυνος *</span>
                          <input value={pmc.contactName} onChange={(e) => setPmc({ ...pmc, contactName: e.target.value })} required className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm outline-none focus:border-primary" />
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Email *</span>
                        <span className="relative block">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                          <input value={pmc.email} onChange={(e) => setPmc({ ...pmc, email: e.target.value })} required type="email" className={inputClass} />
                        </span>
                      </label>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Τηλέφωνο</span>
                          <span className="relative block">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                            <input value={pmc.phone} onChange={(e) => setPmc({ ...pmc, phone: e.target.value })} className={inputClass} />
                          </span>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Πόλη</span>
                          <span className="relative block">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                            <input value={pmc.city} onChange={(e) => setPmc({ ...pmc, city: e.target.value })} className={inputClass} />
                          </span>
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase text-outline">Εκτιμώμενες πολυκατοικίες</span>
                        <input value={pmc.propertiesEstimate} onChange={(e) => setPmc({ ...pmc, propertiesEstimate: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm outline-none focus:border-primary" />
                      </label>

                      <button type="submit" className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-extrabold text-white shadow hover:bg-[#0d5c63]">
                        Υποβολή αιτήματος
                      </button>
                    </form>
                  </>
                )}

                {/* Step 3b — PMC request submitted confirmation */}
                {subKind === 'company' && pmcSubmitted && (
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-primary">Το αίτημα υποβλήθηκε</h2>
                    <p className="mt-2 text-sm leading-6 text-outline">
                      Ευχαριστούμε, <b>{pmc.companyName}</b>. Θα επικοινωνήσουμε στο <b>{pmc.email}</b> για τα επόμενα βήματα.
                    </p>

                    <div className="mt-6 text-left">
                      <PmcStepper current="request" />
                    </div>

                    <button
                      onClick={() => {
                        resetSubscribe();
                        setMode('signin');
                      }}
                      className="mt-6 w-full rounded-lg border border-outline px-4 py-3 text-sm font-bold text-primary hover:bg-surface-container-low"
                    >
                      Επιστροφή στη σύνδεση
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/** Vertical 4-stage pipeline indicator for the PMC onboarding flow. */
function PmcStepper({ current }: { current: (typeof PMC_STEPS)[number]['key'] }) {
  const currentIndex = PMC_STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="mt-5 space-y-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
      {PMC_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-black ${
                done
                  ? 'bg-teal-600 text-white'
                  : active
                  ? 'bg-primary text-white ring-4 ring-primary/15'
                  : 'bg-surface-container-high text-outline'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={`text-sm font-semibold ${active ? 'text-primary' : done ? 'text-on-surface' : 'text-outline'}`}>
              {step.label}
            </span>
            {active && <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Τρέχον</span>}
          </li>
        );
      })}
    </ol>
  );
}
