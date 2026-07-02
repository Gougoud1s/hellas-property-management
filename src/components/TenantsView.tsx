import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  ImagePlus,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  X
} from 'lucide-react';
import {
  IndividualSignupMethod,
  MeansOfContact,
  MocType,
  PmcOnboardingStage,
  Tenant,
  TenantContact,
  TenantType
} from '../types';
import { formatVat, isValidGreekVat } from '../lib/vat';

interface TenantsViewProps {
  tenants: Tenant[];
  onAddTenant: (tenant: Tenant) => void;
  onUpdateTenant: (tenant: Tenant) => void;
  onDeleteTenant: (id: string) => void;
  canManageTenants: boolean;
}

const PAGE_SIZE_OPTIONS = [5, 10, 50, 100];

const TYPE_LABEL: Record<TenantType, string> = {
  company: 'Εταιρεία Διαχείρισης',
  individual: 'Ιδιώτης Διαχειριστής'
};

const MOC_TYPE_LABEL: Record<MocType, string> = {
  landline: 'Σταθερό',
  mobile: 'Κινητό',
  email: 'Email',
  other: 'Άλλο'
};

const MOC_TYPES = Object.keys(MOC_TYPE_LABEL) as MocType[];

const SIGNUP_LABEL: Record<IndividualSignupMethod, string> = {
  email: 'Email',
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple'
};

const ONBOARDING_LABEL: Record<PmcOnboardingStage, string> = {
  request: 'Αίτημα',
  approved: 'Εγκρίθηκε',
  agreement_signed: 'Υπογραφή σύμβασης',
  admin_provisioned: 'Ενεργός λογαριασμός'
};

let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/** Flattened list of every MOC value across all of a tenant's contacts. */
function allMocValues(tenant: Tenant): string[] {
  return (tenant.contacts ?? [])
    .flatMap((contact) => (contact.mocs ?? []).map((moc) => moc.value))
    .filter(Boolean);
}

/** Logo cell with graceful fallback to a type-specific default. */
function TenantLogo({ tenant, size = 40 }: { tenant: Tenant; size?: number }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(tenant.logoUrl) && !broken;
  const dimension = { width: size, height: size };

  if (showImage) {
    return (
      <img
        src={tenant.logoUrl}
        alt={tenant.companyName}
        onError={() => setBroken(true)}
        referrerPolicy="no-referrer"
        style={dimension}
        className="flex-none rounded-lg border border-outline-variant object-cover"
      />
    );
  }

  const isCompany = tenant.tenantType === 'company';
  return (
    <span
      aria-label={TYPE_LABEL[tenant.tenantType]}
      style={dimension}
      className={`flex flex-none items-center justify-center rounded-lg border ${
        isCompany ? 'border-primary/20 bg-primary/10 text-primary' : 'border-secondary/20 bg-secondary/10 text-secondary'
      }`}
    >
      {isCompany ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Draft helpers
// ---------------------------------------------------------------------------

function blankMoc(): MeansOfContact {
  return { id: uid('moc'), type: 'mobile', value: '', availableToProperties: true };
}

function blankContact(): TenantContact {
  return { id: uid('ct'), fullName: '', mocs: [blankMoc()] };
}

function draftFrom(tenant: Tenant | null): Tenant {
  if (tenant) {
    return {
      ...tenant,
      contacts: (tenant.contacts ?? []).map((c) => ({ ...c, mocs: (c.mocs ?? []).map((m) => ({ ...m })) }))
    };
  }
  return {
    id: uid('ten'),
    companyName: '',
    vatNumber: '',
    profession: '',
    address: '',
    zipCode: '',
    contacts: [blankContact()],
    logoUrl: undefined,
    websiteUrl: '',
    tenantType: 'company',
    isActive: true,
    isDeleted: false
  };
}

// ---------------------------------------------------------------------------
// Full-page editor
// ---------------------------------------------------------------------------

interface TenantEditorProps {
  original: Tenant | null;
  flash: string | null;
  onBack: () => void;
  onCommit: (tenant: Tenant, opts: { keepEditing: boolean }) => void;
  onRequestDelete: (id: string, name: string) => void;
}

function TenantEditor({ original, flash, onBack, onCommit, onRequestDelete }: TenantEditorProps) {
  const [draft, setDraft] = useState<Tenant>(() => draftFrom(original));
  const [touched, setTouched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const vatValid = isValidGreekVat(draft.vatNumber);
  const zipValid = draft.zipCode.trim() === '' || /^\d{5}$/.test(draft.zipCode.trim());
  const nameValid = draft.companyName.trim().length > 0;
  const canSave = nameValid && vatValid && zipValid;

  const set = <K extends keyof Tenant>(key: K, value: Tenant[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const updateContact = (contactId: string, patch: Partial<TenantContact>) =>
    setDraft((prev) => ({ ...prev, contacts: prev.contacts.map((c) => (c.id === contactId ? { ...c, ...patch } : c)) }));

  const updateMoc = (contactId: string, mocId: string, patch: Partial<MeansOfContact>) =>
    setDraft((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) =>
        c.id === contactId ? { ...c, mocs: c.mocs.map((m) => (m.id === mocId ? { ...m, ...patch } : m)) } : c
      )
    }));

  const addContact = () => setDraft((prev) => ({ ...prev, contacts: [...prev.contacts, blankContact()] }));
  const removeContact = (contactId: string) =>
    setDraft((prev) => ({ ...prev, contacts: prev.contacts.filter((c) => c.id !== contactId) }));
  const addMoc = (contactId: string) =>
    setDraft((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === contactId ? { ...c, mocs: [...c.mocs, blankMoc()] } : c))
    }));
  const removeMoc = (contactId: string, mocId: string) =>
    setDraft((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === contactId ? { ...c, mocs: c.mocs.filter((m) => m.id !== mocId) } : c))
    }));

  const handleLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('logoUrl', typeof reader.result === 'string' ? reader.result : undefined);
    reader.readAsDataURL(file);
  };

  const buildClean = (): Tenant => {
    const contacts = draft.contacts
      .map((c) => ({ ...c, fullName: c.fullName.trim(), mocs: c.mocs.filter((m) => m.value.trim() !== '') }))
      .filter((c) => c.fullName !== '' || c.mocs.length > 0);
    return {
      ...draft,
      companyName: draft.companyName.trim(),
      vatNumber: formatVat(draft.vatNumber),
      profession: draft.profession.trim(),
      address: draft.address.trim(),
      zipCode: draft.zipCode.trim(),
      websiteUrl: draft.websiteUrl?.trim() || undefined,
      contacts
    };
  };

  const handleSave = (keepEditing: boolean) => {
    setTouched(true);
    if (!canSave) return;
    onCommit(buildClean(), { keepEditing });
  };

  const inputClass = 'w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary';
  const labelClass = 'mb-1.5 block text-xs font-bold text-outline';

  const totalMocs = draft.contacts.reduce((sum, c) => sum + c.mocs.filter((m) => m.value.trim() !== '').length, 0);
  const availableMocs = draft.contacts.reduce(
    (sum, c) => sum + c.mocs.filter((m) => m.value.trim() !== '' && m.availableToProperties).length,
    0
  );
  const subscriptionOrigin =
    draft.tenantType === 'individual'
      ? draft.signupMethod
        ? `Εγγραφή με ${SIGNUP_LABEL[draft.signupMethod]}`
        : '—'
      : draft.onboardingStage
      ? ONBOARDING_LABEL[draft.onboardingStage]
      : '—';

  return (
    <div className="space-y-6">
      {/* HEADER — sticky action bar (spans main padding, stays visible on scroll) */}
      <div className="sticky top-0 z-20 -mx-8 -mt-8 flex flex-col gap-4 border-b border-outline-variant bg-surface/95 px-8 pb-4 pt-6 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:flex-row md:items-start md:justify-between">
        {/* Left */}
        <div className="min-w-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-outline hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Πίσω στη λίστα
          </button>
          <div className="mt-2 flex items-center gap-3">
            <TenantLogo tenant={draft} size={44} />
            <h2 className="truncate text-2xl font-black text-primary">
              {draft.companyName.trim() || (original ? 'Tenant' : 'Νέος Tenant')}
            </h2>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-none items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={touched && !canSave}
            className="rounded-lg border border-outline px-4 py-2 text-sm font-bold text-primary hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
          >
            Αποθήκευση
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={touched && !canSave}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Αποθήκευση & Συνέχεια
          </button>

          {original && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="Περισσότερες ενέργειες"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline text-on-surface-variant hover:bg-surface-container"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-outline-variant bg-surface-container-lowest p-1.5 shadow-lg">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestDelete(draft.id, draft.companyName || 'tenant');
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-error hover:bg-error/5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Διαγραφή (soft delete)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {flash && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800">
          <Check className="h-4 w-4" />
          {flash}
        </div>
      )}

      {touched && !canSave && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-2 text-xs font-semibold text-error">
          Ελέγξτε τα υποχρεωτικά πεδία (επωνυμία, έγκυρο ΑΦΜ, Τ.Κ.).
        </div>
      )}

      {/* BODY */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Editable fields */}
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase text-primary">Επεξεργάσιμα πεδία</h3>

            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <TenantLogo tenant={draft} size={72} />
                <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Logo
                </button>
                {draft.logoUrl && (
                  <button type="button" onClick={() => set('logoUrl', undefined)} className="text-[10px] text-outline hover:text-error">
                    Αφαίρεση
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className={labelClass}>ΕΠΩΝΥΜΙΑ / ΟΝΟΜΑ *</label>
                  <input value={draft.companyName} onChange={(e) => set('companyName', e.target.value)} className={inputClass} autoFocus />
                  {touched && !nameValid && <p className="mt-1 text-[11px] font-semibold text-error">Υποχρεωτικό πεδίο.</p>}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>ΤΥΠΟΣ</label>
                    <select value={draft.tenantType} onChange={(e) => set('tenantType', e.target.value as TenantType)} className={inputClass}>
                      <option value="company">Εταιρεία</option>
                      <option value="individual">Ιδιώτης</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>ΑΦΜ / VAT *</label>
                    <input
                      value={draft.vatNumber}
                      onChange={(e) => set('vatNumber', e.target.value)}
                      placeholder="EL123456789"
                      className={`${inputClass} ${draft.vatNumber && !vatValid ? 'border-error focus:border-error' : ''}`}
                    />
                    {draft.vatNumber !== '' && !vatValid && (
                      <p className="mt-1 text-[11px] font-semibold text-error">Μη έγκυρο ΑΦΜ (EL + 9 ψηφία, με checksum).</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>ΕΠΑΓΓΕΛΜΑ</label>
                <input value={draft.profession} onChange={(e) => set('profession', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>WEBSITE</label>
                <input value={draft.websiteUrl ?? ''} onChange={(e) => set('websiteUrl', e.target.value)} placeholder="https://…" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>ΔΙΕΥΘΥΝΣΗ</label>
                <input value={draft.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Τ.Κ.</label>
                <input
                  value={draft.zipCode}
                  onChange={(e) => set('zipCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                  inputMode="numeric"
                  className={`${inputClass} ${!zipValid ? 'border-error focus:border-error' : ''}`}
                />
                {!zipValid && <p className="mt-1 text-[11px] font-semibold text-error">5 ψηφία.</p>}
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 accent-primary" />
                  Ενεργός (IsActive)
                </label>
              </div>
            </div>
          </section>

          {/* Contacts + MOCs */}
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-primary">Επαφές &amp; Στοιχεία επικοινωνίας</h3>
              <button type="button" onClick={addContact} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" />
                Επαφή
              </button>
            </div>

            <div className="space-y-4">
              {draft.contacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex items-center gap-2">
                    <input
                      value={contact.fullName}
                      onChange={(e) => updateContact(contact.id, { fullName: e.target.value })}
                      placeholder="Ονοματεπώνυμο επαφής"
                      className="flex-1 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => removeContact(contact.id)} className="rounded-lg p-2 text-outline hover:bg-surface-container hover:text-error" aria-label="Διαγραφή επαφής">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {contact.mocs.map((moc) => (
                      <div key={moc.id} className="flex flex-wrap items-center gap-2">
                        <select
                          value={moc.type}
                          onChange={(e) => updateMoc(contact.id, moc.id, { type: e.target.value as MocType })}
                          className="w-28 rounded-lg border border-outline bg-surface-container-lowest px-2 py-2 text-xs font-semibold outline-none focus:border-primary"
                        >
                          {MOC_TYPES.map((type) => (
                            <option key={type} value={type}>{MOC_TYPE_LABEL[type]}</option>
                          ))}
                        </select>
                        <input
                          value={moc.value}
                          onChange={(e) => updateMoc(contact.id, moc.id, { value: e.target.value })}
                          placeholder={moc.type === 'email' ? 'name@example.gr' : 'π.χ. 6974818213'}
                          className="min-w-[140px] flex-1 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        <label className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-on-surface-variant" title="Διαθέσιμο στις πολυκατοικίες">
                          <input
                            type="checkbox"
                            checked={moc.availableToProperties}
                            onChange={(e) => updateMoc(contact.id, moc.id, { availableToProperties: e.target.checked })}
                            className="h-4 w-4 accent-primary"
                          />
                          Στις πολυκατοικίες
                        </label>
                        <button type="button" onClick={() => removeMoc(contact.id, moc.id)} className="rounded-lg p-2 text-outline hover:bg-surface-container hover:text-error" aria-label="Διαγραφή στοιχείου">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addMoc(contact.id)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                      <Plus className="h-3.5 w-3.5" />
                      Στοιχείο επικοινωνίας
                    </button>
                  </div>
                </div>
              ))}
              {draft.contacts.length === 0 && (
                <p className="rounded-lg border border-dashed border-outline-variant px-4 py-6 text-center text-xs text-outline">Καμία επαφή. Προσθέστε μία.</p>
              )}
            </div>
          </section>
        </div>

        {/* Read-only fields */}
        <div className="space-y-6">
          <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
            <h3 className="mb-4 text-sm font-black uppercase text-primary">Μόνο για ανάγνωση</h3>
            <dl className="space-y-3 text-sm">
              <ReadOnlyRow label="Tenant ID" value={draft.id} mono />
              <ReadOnlyRow label="Τύπος" value={TYPE_LABEL[draft.tenantType]} />
              <ReadOnlyRow label="ΑΦΜ (canonical)" value={draft.vatNumber ? formatVat(draft.vatNumber) : '—'} mono />
              <ReadOnlyRow label="Προέλευση εγγραφής" value={subscriptionOrigin} />
              <ReadOnlyRow label="Σύνολο επαφών" value={String(draft.contacts.length)} />
              <ReadOnlyRow label="Σύνολο MOC" value={String(totalMocs)} />
              <ReadOnlyRow label="MOC σε πολυκατοικίες" value={String(availableMocs)} />
              <ReadOnlyRow label="IsDeleted" value={draft.isDeleted ? 'Ναι' : 'Όχι'} />
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-outline">
              Τα πεδία αυτά διαχειρίζονται από το σύστημα και τη ροή εγγραφής και δεν επεξεργάζονται χειροκίνητα.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-bold uppercase text-outline">{label}</dt>
      <dd className={`text-right text-sm font-semibold text-on-surface ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onMouseDown={onCancel}
    >
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-error/10 text-error">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-lg font-black text-on-surface">{title}</h3>
            <p id="confirm-message" className="mt-1 text-sm text-on-surface-variant">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-outline px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container"
          >
            Άκυρο
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            <Trash2 className="h-4 w-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List + router
// ---------------------------------------------------------------------------

type ViewState = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; tenant: Tenant };

type PendingAction =
  | { kind: 'delete-one'; id: string; name: string; fromEditor: boolean }
  | { kind: 'delete-many'; ids: string[] };

export default function TenantsView({ tenants, onAddTenant, onUpdateTenant, onDeleteTenant, canManageTenants }: TenantsViewProps) {
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewState>({ mode: 'list' });
  const [flash, setFlash] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);

  // Auto-dismiss the save/delete confirmation.
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(timer);
  }, [flash]);

  const visible = useMemo(() => tenants.filter((t) => !t.isDeleted), [tenants]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return visible;
    return visible.filter((tenant) => {
      const haystack = [
        tenant.companyName,
        tenant.vatNumber,
        tenant.profession,
        tenant.address,
        tenant.zipCode,
        tenant.websiteUrl ?? '',
        tenant.contacts.map((c) => c.fullName).join(' '),
        allMocValues(tenant).join(' ')
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, visible]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);
  const rangeStart = total === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, total);

  const pageIds = pageRows.map((t) => t.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  const commit = (tenant: Tenant, opts: { keepEditing: boolean }) => {
    const isNew = view.mode !== 'edit';
    if (isNew) onAddTenant(tenant);
    else onUpdateTenant(tenant);
    setFlash(isNew ? `Ο tenant «${tenant.companyName}» δημιουργήθηκε.` : 'Οι αλλαγές αποθηκεύτηκαν.');
    setView(opts.keepEditing ? { mode: 'edit', tenant } : { mode: 'list' });
  };

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const bulkSetActive = (isActive: boolean) => {
    const targets = visible.filter((t) => selected.has(t.id));
    targets.forEach((t) => onUpdateTenant({ ...t, isActive }));
    setFlash(`${targets.length} ${targets.length === 1 ? 'tenant' : 'tenants'} ${isActive ? 'ενεργοποιήθηκαν' : 'απενεργοποιήθηκαν'}.`);
  };

  const runPending = () => {
    if (!pending) return;
    if (pending.kind === 'delete-one') {
      onDeleteTenant(pending.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(pending.id);
        return next;
      });
      setFlash('Ο tenant διαγράφηκε.');
      if (pending.fromEditor) setView({ mode: 'list' });
    } else {
      pending.ids.forEach((id) => onDeleteTenant(id));
      setFlash(`${pending.ids.length} ${pending.ids.length === 1 ? 'tenant' : 'tenants'} διαγράφηκαν.`);
      setSelected(new Set());
    }
    setPending(null);
  };

  const confirmDialog = pending && (
    <ConfirmDialog
      title={pending.kind === 'delete-many' ? 'Διαγραφή tenants' : 'Διαγραφή tenant'}
      message={
        pending.kind === 'delete-many'
          ? `Θα διαγραφούν ${pending.ids.length} tenants (soft delete, IsDeleted=true). Μπορείτε να τα επαναφέρετε από τη βάση.`
          : `Θα διαγραφεί ο «${pending.name}» (soft delete, IsDeleted=true).`
      }
      confirmLabel="Διαγραφή"
      onConfirm={runPending}
      onCancel={() => setPending(null)}
    />
  );

  // Editor page
  if (view.mode !== 'list') {
    const original = view.mode === 'edit' ? view.tenant : null;
    return (
      <>
        <TenantEditor
          key={original?.id ?? 'new'}
          original={original}
          flash={view.mode === 'edit' ? flash : null}
          onBack={() => setView({ mode: 'list' })}
          onCommit={commit}
          onRequestDelete={(id, name) => setPending({ kind: 'delete-one', id, name, fromEditor: true })}
        />
        {confirmDialog}
      </>
    );
  }

  return (
    <div id="tenants-view" className="space-y-5">
      {flash && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
          <Check className="h-4 w-4" />
          {flash}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
            <Users className="h-5 w-5" />
            Tenants
          </h2>
          <p className="mt-1 text-sm text-outline">
            Πελάτες της πλατφόρμας — εταιρείες και ιδιώτες με τις επαφές και τα στοιχεία επικοινωνίας τους.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
                setSelected(new Set());
              }}
              placeholder="Αναζήτηση (επωνυμία, ΑΦΜ, επαφή, τηλέφωνο…)"
              aria-label="Αναζήτηση tenant"
              className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          {canManageTenants && (
            <button
              onClick={() => setView({ mode: 'create' })}
              className="flex flex-none items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#0d5c63]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Νέος Tenant</span>
              <span className="sm:hidden">Νέος</span>
            </button>
          )}
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {canManageTenants && selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-white">{selected.size}</span>
            επιλεγμένα
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => bulkSetActive(true)}
              className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-low"
            >
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              Ενεργοποίηση
            </button>
            <button
              onClick={() => bulkSetActive(false)}
              className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-low"
            >
              <Ban className="h-4 w-4 text-outline" />
              Απενεργοποίηση
            </button>
            <button
              onClick={() => setPending({ kind: 'delete-many', ids: [...selected] })}
              className="flex items-center gap-1.5 rounded-lg border border-error/40 bg-error/5 px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10"
            >
              <Trash2 className="h-4 w-4" />
              Διαγραφή
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg p-1.5 text-outline hover:bg-surface-container"
              aria-label="Καθαρισμός επιλογής"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-xs font-bold uppercase tracking-wide text-outline">
                {canManageTenants && (
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      aria-label="Επιλογή όλων"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
                      }}
                      onChange={toggleAllOnPage}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </th>
                )}
                <th className="w-16 px-6 py-4">Logo</th>
                <th className="px-6 py-4">Επωνυμία / Όνομα</th>
                <th className="w-32 px-6 py-4">Κατάσταση</th>
                <th className="px-6 py-4">Στοιχεία επικοινωνίας</th>
                {canManageTenants && <th className="w-24 px-6 py-4 text-right">Ενέργειες</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {pageRows.map((tenant) => (
                <tr
                  key={tenant.id}
                  onClick={() => canManageTenants && setView({ mode: 'edit', tenant })}
                  className={`align-top hover:bg-surface-container-low/40 ${canManageTenants ? 'cursor-pointer' : ''} ${
                    selected.has(tenant.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  {canManageTenants && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Επιλογή ${tenant.companyName}`}
                        checked={selected.has(tenant.id)}
                        onChange={() => toggleOne(tenant.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <TenantLogo tenant={tenant} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{tenant.companyName}</div>
                    <div className="mt-0.5 text-xs text-outline">
                      {TYPE_LABEL[tenant.tenantType]}
                      {tenant.vatNumber ? ` · ${tenant.vatNumber}` : ''}
                    </div>
                    {tenant.websiteUrl && (
                      <a
                        href={tenant.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        {tenant.websiteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        tenant.isActive ? 'bg-teal-50 text-teal-700' : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {tenant.isActive ? 'Ενεργός' : 'Ανενεργός'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="block max-w-xl select-all whitespace-normal break-words font-mono text-xs text-on-surface-variant">
                      {allMocValues(tenant).join(' | ') || '—'}
                    </span>
                    {tenant.contacts.length > 1 && (
                      <span className="mt-1 block text-[10px] text-outline">{tenant.contacts.length} επαφές</span>
                    )}
                  </td>
                  {canManageTenants && (
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setView({ mode: 'edit', tenant });
                          }}
                          className="rounded-lg p-2 text-outline hover:bg-surface-container hover:text-primary"
                          aria-label={`Επεξεργασία ${tenant.companyName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPending({ kind: 'delete-one', id: tenant.id, name: tenant.companyName, fromEditor: false });
                          }}
                          className="rounded-lg p-2 text-outline hover:bg-surface-container hover:text-error"
                          aria-label={`Διαγραφή ${tenant.companyName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={canManageTenants ? 6 : 4} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-outline">
                      <Users className="h-10 w-10 text-outline-variant" />
                      <p className="mt-3 text-sm font-semibold text-on-surface-variant">Δεν βρέθηκαν tenants</p>
                      <p className="mt-1 text-xs">Δοκιμάστε διαφορετικό όρο αναζήτησης.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER — pagination centered, with page-size options */}
        <div className="grid grid-cols-1 items-center gap-3 border-t border-outline-variant/60 bg-surface-container-low px-6 py-3 sm:grid-cols-3">
          <div className="text-xs text-outline">
            {rangeStart}–{rangeEnd} από {total}
          </div>

          <div className="flex items-center justify-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-outline">
              <span className="hidden sm:inline">Εγγραφές:</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Εγγραφές ανά σελίδα"
                className="rounded-lg border border-outline bg-surface-container-lowest px-2 py-1 text-xs font-semibold outline-none focus:border-primary"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                aria-label="Προηγούμενη σελίδα"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-semibold text-on-surface">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Επόμενη σελίδα"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="hidden text-right text-xs text-outline sm:block">
            Σελίδα {currentPage} από {totalPages}
          </div>
        </div>
      </div>

      {confirmDialog}
    </div>
  );
}
