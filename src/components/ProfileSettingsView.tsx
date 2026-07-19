import React, { useEffect, useState } from 'react';
import { Camera, Lock, Save, ShieldCheck, UserCircle } from 'lucide-react';
import { AuthUser, getRoleLabel } from '../lib/auth';
import { getPlatformPermissions, getPlatformRoleLabel } from '../lib/rbac';
import { getConfiguredDataMode } from '../lib/backendContracts';
import { supabase } from '../lib/supabase/client';

interface ProfileSettingsViewProps {
  currentUser: AuthUser;
  onUpdateProfile: (user: AuthUser) => void;
}

const PLATFORM_AREAS = [
  { key: 'PlatformSubscription', label: 'Συνδρομή πλατφόρμας' },
  { key: 'PMSettings', label: 'Ρυθμίσεις εταιρείας' },
  { key: 'PropertiesData', label: 'Δεδομένα ακινήτων' },
  { key: 'Users', label: 'Χρήστες' }
] as const;

export default function ProfileSettingsView({ currentUser, onUpdateProfile }: ProfileSettingsViewProps) {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [notificationEmail, setNotificationEmail] = useState(currentUser.notificationEmail ?? true);
  const [notificationSms, setNotificationSms] = useState(currentUser.notificationSms ?? false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaEnrollment, setMfaEnrollment] = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');
  const cloud = getConfiguredDataMode() === 'supabase';

  useEffect(() => {
    if (!cloud) return;
    void supabase.auth.mfa.listFactors().then(({ data }) => setMfaEnabled(data?.totp.some((factor) => factor.status === 'verified') ?? false));
  }, [cloud]);

  const beginMfaEnrollment = async () => {
    setMfaMessage('');
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Atlas PM' });
    if (error) { setMfaMessage(error.message); return; }
    setMfaEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyMfaEnrollment = async () => {
    if (!mfaEnrollment || !/^\d{6}$/.test(mfaCode)) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaEnrollment.id, code: mfaCode });
    if (error) { setMfaMessage(error.message); return; }
    setMfaEnabled(true); setMfaEnrollment(null); setMfaCode(''); setMfaMessage('Το MFA ενεργοποιήθηκε επιτυχώς.');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdateProfile({
      ...currentUser,
      fullName,
      phone,
      jobTitle,
      avatarUrl,
      notificationEmail,
      notificationSms
    });
  };

  return (
    <div id="profile-settings-view" className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
          <UserCircle className="h-5 w-5" />
          Το Προφίλ μου
        </h2>
        <p className="mt-1 text-sm text-outline">
          Κάθε χρήστης μπορεί να επεξεργάζεται τα προσωπικά του στοιχεία. Ρόλος, tenant και συνδεδεμένες μονάδες αλλάζουν μόνο από admin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                className="h-28 w-28 rounded-full border-4 border-primary/20 object-cover"
                src={avatarUrl}
                alt={fullName}
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-1 right-1 rounded-full bg-primary p-2 text-white">
                <Camera className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 text-lg font-black text-primary">{currentUser.fullName}</div>
            <div className="text-xs font-bold text-outline">{getRoleLabel(currentUser.role)}</div>
            <div className="mt-4 w-full rounded-lg border border-outline-variant bg-surface-container-low p-3 text-left">
              <div className="text-[10px] font-black uppercase text-outline">Κλειδωμένα πεδία</div>
              <div className="mt-2 space-y-1 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Email: {currentUser.email}
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Tenant: {currentUser.companyName}
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Ρόλος: {getRoleLabel(currentUser.role)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="text-sm font-black uppercase text-primary">Προσωπικά στοιχεία</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-outline">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-outline">ΤΗΛΕΦΩΝΟ</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-outline">ΤΙΤΛΟΣ / ΠΕΡΙΓΡΑΦΗ</label>
                <input
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-outline">PROFILE IMAGE URL</label>
                <input
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="text-sm font-black uppercase text-primary">Ειδοποιήσεις</h3>
            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-on-surface">Email updates</span>
                  <span className="text-xs text-outline">Λογαριασμοί, πληρωμές, έγγραφα και βλάβες.</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationEmail}
                  onChange={(event) => setNotificationEmail(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-on-surface">SMS alerts</span>
                  <span className="text-xs text-outline">Μόνο επείγουσες βλάβες και κρίσιμες ειδοποιήσεις.</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSms}
                  onChange={(event) => setNotificationSms(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            </div>
          </div>

          {cloud && <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase text-primary"><ShieldCheck className="h-4 w-4" />Έλεγχος δύο παραγόντων (MFA)</h3>
            <p className="mt-2 text-xs leading-relaxed text-outline">Οι διαχειριστές εταιρείας πρέπει να χρησιμοποιούν εφαρμογή authenticator πριν αποκτήσουν πρόσβαση σε οικονομικές λειτουργίες.</p>
            {mfaEnabled ? <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-bold text-teal-700">MFA ενεργό</div> : !mfaEnrollment ?
              <button type="button" onClick={beginMfaEnrollment} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Ενεργοποίηση MFA</button> :
              <div className="mt-4 space-y-3">
                <img src={mfaEnrollment.qrCode} alt="QR code για εφαρμογή authenticator" className="h-44 w-44 rounded-lg border bg-white p-2" />
                <div className="text-xs text-outline">Εναλλακτικό κλειδί: <code className="break-all font-mono">{mfaEnrollment.secret}</code></div>
                <div className="flex gap-2"><input value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" className="w-36 rounded-lg border border-outline px-3 py-2 font-mono" />
                  <button type="button" onClick={verifyMfaEnrollment} disabled={mfaCode.length !== 6} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Επιβεβαίωση</button></div>
              </div>}
            {mfaMessage && <p role="status" className="mt-3 text-xs font-semibold text-outline">{mfaMessage}</p>}
          </div>}

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase text-primary">
              <ShieldCheck className="h-4 w-4" />
              Ρόλος & Δικαιώματα πλατφόρμας
            </h3>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-outline">Ρόλος:</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                {getPlatformRoleLabel(currentUser)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PLATFORM_AREAS.map((area) => {
                const perms = getPlatformPermissions(currentUser);
                const canRead = perms.includes(`Read${area.key}` as (typeof perms)[number]);
                const canManage = perms.includes(`Manage${area.key}` as (typeof perms)[number]);
                return (
                  <div key={area.key} className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
                    <span className="text-xs font-semibold text-on-surface">{area.label}</span>
                    <span className="flex gap-1">
                      {canManage ? (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Διαχείριση</span>
                      ) : canRead ? (
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">Ανάγνωση</span>
                      ) : (
                        <span className="text-[10px] font-bold text-outline">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-outline">
              «Διαχείριση» περιλαμβάνει Ανάγνωση + Δημιουργία/Επεξεργασία/Διαγραφή. Τα δικαιώματα καθορίζονται από τον ρόλο και δεν επεξεργάζονται εδώ.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d5c63]">
            <Save className="h-4 w-4" />
            Αποθήκευση Προφίλ
          </button>
        </div>
      </form>
    </div>
  );
}
