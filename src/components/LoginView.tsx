import React, { useState } from 'react';
import { Building2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { AuthUser, DEMO_LOGIN_HINTS, loginWithCredentials } from '../lib/auth';

interface LoginViewProps {
  onAuthenticated: (user: AuthUser) => void;
}

export default function LoginView({ onAuthenticated }: LoginViewProps) {
  const [email, setEmail] = useState('admin@hellaspm.gr');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = loginWithCredentials(email, password);
    if (!result.ok || !result.user) {
      setError(result.error || 'Δεν ήταν δυνατή η σύνδεση.');
      return;
    }

    setError('');
    onAuthenticated(result.user);
  };

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
              <div className="mt-1 text-xs">Κάθε εταιρεία βλέπει μόνο τα δικά της δεδομένα.</div>
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
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-extrabold text-white shadow hover:bg-[#0d5c63]"
              >
                Είσοδος στο Atlas PM
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
          </div>
        </section>
      </div>
    </main>
  );
}
