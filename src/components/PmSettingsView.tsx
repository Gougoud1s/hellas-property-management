import React, { useEffect, useState } from 'react';
import { Check, Lock, Save, SlidersHorizontal } from 'lucide-react';
import { PmSettings } from '../types';

interface PmSettingsViewProps {
  settings: PmSettings;
  canManage: boolean;
  onSave: (settings: PmSettings) => void;
}

const CURRENCIES = ['EUR', 'USD', 'GBP'];
const MONTHS = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

export default function PmSettingsView({ settings, canManage, onSave }: PmSettingsViewProps) {
  const [draft, setDraft] = useState<PmSettings>(settings);
  const [saved, setSaved] = useState(false);

  // Keep the local draft in sync if the source changes underneath us.
  useEffect(() => setDraft(settings), [settings]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(timer);
  }, [saved]);

  const set = <K extends keyof PmSettings>(key: K, value: PmSettings[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    onSave(draft);
    setSaved(true);
  };

  const inputClass = 'w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60';
  const labelClass = 'mb-1.5 block text-xs font-bold text-outline';
  const num = (value: string) => Number(value.replace(/[^0-9.]/g, '')) || 0;

  return (
    <form id="pm-settings-view" onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-outline-variant pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
            <SlidersHorizontal className="h-5 w-5" />
            Ρυθμίσεις εταιρείας
          </h2>
          <p className="mt-1 text-sm text-outline">
            Προεπιλογές διαχείρισης: νόμισμα, ΦΠΑ, όροι πληρωμής, τιμολόγηση και ειδοποιήσεις.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span role="status" aria-live="polite" className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
              <Check className="h-4 w-4" />
              Αποθηκεύτηκε
            </span>
          )}
          <button
            type="submit"
            disabled={!canManage}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Αποθήκευση
          </button>
        </div>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface-variant">
          <Lock className="h-4 w-4" />
          Έχετε δικαίωμα ανάγνωσης. Η επεξεργασία απαιτεί ManagePMSettings.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Organisation */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase text-primary">Οργανισμός</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>ΕΠΩΝΥΜΙΑ ΟΡΓΑΝΙΣΜΟΥ</label>
              <input value={draft.organizationName} onChange={(e) => set('organizationName', e.target.value)} disabled={!canManage} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ΝΟΜΙΣΜΑ</label>
                <select value={draft.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} disabled={!canManage} className={inputClass}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>ΑΡΧΗ ΟΙΚ. ΕΤΟΥΣ</label>
                <select
                  value={draft.fiscalYearStartMonth}
                  onChange={(e) => set('fiscalYearStartMonth', Number(e.target.value))}
                  disabled={!canManage}
                  className={inputClass}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Billing */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase text-primary">Τιμολόγηση &amp; Οικονομικά</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ΦΠΑ %</label>
              <input value={draft.vatPercentage} onChange={(e) => set('vatPercentage', num(e.target.value))} inputMode="decimal" disabled={!canManage} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ΠΡΟΣΑΥΞΗΣΗ ΕΚΠΡΟΘΕΣΜΗΣ %</label>
              <input value={draft.lateFeePercentage} onChange={(e) => set('lateFeePercentage', num(e.target.value))} inputMode="decimal" disabled={!canManage} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ΟΡΟΙ ΠΛΗΡΩΜΗΣ (ημέρες)</label>
              <input value={draft.paymentTermsDays} onChange={(e) => set('paymentTermsDays', num(e.target.value))} inputMode="numeric" disabled={!canManage} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ΑΠΟΘΕΜΑΤΙΚΟ %</label>
              <input value={draft.reserveFundPercentage} onChange={(e) => set('reserveFundPercentage', num(e.target.value))} inputMode="decimal" disabled={!canManage} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>ΠΡΟΘΕΜΑ ΠΑΡΑΣΤΑΤΙΚΩΝ</label>
              <input value={draft.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} disabled={!canManage} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-black uppercase text-primary">Ειδοποιήσεις</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
              <span>
                <span className="block text-sm font-bold text-on-surface">Email ειδοποιήσεις</span>
                <span className="text-xs text-outline">Λογαριασμοί, πληρωμές και έγγραφα.</span>
              </span>
              <input type="checkbox" checked={draft.notifyByEmail} onChange={(e) => set('notifyByEmail', e.target.checked)} disabled={!canManage} className="h-4 w-4 accent-primary" />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
              <span>
                <span className="block text-sm font-bold text-on-surface">SMS ειδοποιήσεις</span>
                <span className="text-xs text-outline">Μόνο επείγουσες ενημερώσεις.</span>
              </span>
              <input type="checkbox" checked={draft.notifyBySms} onChange={(e) => set('notifyBySms', e.target.checked)} disabled={!canManage} className="h-4 w-4 accent-primary" />
            </label>
          </div>
        </section>
      </div>
    </form>
  );
}
