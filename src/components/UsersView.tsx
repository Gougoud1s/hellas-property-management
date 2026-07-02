import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X
} from 'lucide-react';
import { AuthUser, UserRole, canManageUserRole, getRoleLabel } from '../lib/auth';

interface UsersViewProps {
  users: AuthUser[];
  currentUser: AuthUser;
  onAddUser: (user: AuthUser) => void;
  onUpdateUser: (user: AuthUser) => void;
  canManageUsers: boolean;
}

const PAGE_SIZE_OPTIONS = [5, 10, 50, 100];
const ROLE_OPTIONS: UserRole[] = ['platform_admin', 'company_admin', 'company_staff', 'owner', 'resident'];

const STATUS_META: Record<NonNullable<AuthUser['status']>, { label: string; className: string }> = {
  active: { label: 'Ενεργός', className: 'bg-teal-50 text-teal-700' },
  invited: { label: 'Πρόσκληση', className: 'bg-amber-50 text-amber-700' },
  disabled: { label: 'Ανενεργός', className: 'bg-surface-container-high text-on-surface-variant' }
};

/** Phones + email of a user, for the copy-friendly MOC string. */
function userMocs(user: AuthUser): string[] {
  return [user.phone, user.email].filter(Boolean) as string[];
}

/** Avatar with graceful fallback to a person/company default. */
function UserAvatar({ user }: { user: AuthUser }) {
  const [broken, setBroken] = useState(false);
  const isCompanyLevel = user.role === 'platform_admin' || user.role === 'company_admin';

  if (user.avatarUrl && !broken) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.fullName}
        onError={() => setBroken(true)}
        referrerPolicy="no-referrer"
        className="h-10 w-10 flex-none rounded-full border border-outline-variant object-cover"
      />
    );
  }
  return (
    <span
      aria-label={user.fullName}
      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full border ${
        isCompanyLevel ? 'border-primary/20 bg-primary/10 text-primary' : 'border-secondary/20 bg-secondary/10 text-secondary'
      }`}
    >
      {isCompanyLevel ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
    </span>
  );
}

interface UserModalProps {
  currentUser: AuthUser;
  original: AuthUser | null;
  onClose: () => void;
  onSubmit: (user: AuthUser) => void;
}

const STATUS_OPTIONS: NonNullable<AuthUser['status']>[] = ['active', 'invited', 'disabled'];

function UserModal({ currentUser, original, onClose, onSubmit }: UserModalProps) {
  const allowedRoles = ROLE_OPTIONS.filter((role) => canManageUserRole(currentUser, role));
  const [fullName, setFullName] = useState(original?.fullName ?? '');
  const [email, setEmail] = useState(original?.email ?? '');
  const [phone, setPhone] = useState(original?.phone ?? '');
  const [role, setRole] = useState<UserRole>(original?.role ?? allowedRoles[0] ?? 'company_staff');
  const [status, setStatus] = useState<NonNullable<AuthUser['status']>>(original?.status ?? 'invited');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSubmit = fullName.trim() !== '' && email.trim() !== '' && canManageUserRole(currentUser, role);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const isPortal = role === 'owner' || role === 'resident';
    if (original) {
      onSubmit({ ...original, fullName: fullName.trim(), phone: phone.trim() || undefined, role, status });
    } else {
      onSubmit({
        id: `usr-${Date.now()}`,
        tenantId: currentUser.tenantId,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        companyName: currentUser.companyName,
        avatarUrl: `https://ui-avatars.com/api/?background=004349&color=fff&bold=true&name=${encodeURIComponent(fullName.trim())}`,
        status: 'invited',
        notificationEmail: true,
        notificationSms: false,
        propertyIds: isPortal ? [] : undefined,
        unitIds: isPortal ? [] : undefined
      });
    }
    onClose();
  };

  const inputClass = 'w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary';
  const labelClass = 'mb-1.5 block text-xs font-bold text-outline';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="user-modal-title" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 id="user-modal-title" className="flex items-center gap-2 text-lg font-black text-primary">
            <ShieldCheck className="h-5 w-5" />
            {original ? 'Επεξεργασία Χρήστη' : 'Νέος Χρήστης'}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-outline hover:bg-surface-container" aria-label="Κλείσιμο">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>ΟΝΟΜΑΤΕΠΩΝΥΜΟ *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>EMAIL *{original && <span className="ml-1 font-normal normal-case text-outline">(δεν αλλάζει)</span>}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required disabled={!!original} className={`${inputClass} disabled:opacity-60`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>ΤΗΛΕΦΩΝΟ</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ΡΟΛΟΣ</label>
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputClass}>
                {allowedRoles.map((r) => (
                  <option key={r} value={r}>{getRoleLabel(r)}</option>
                ))}
              </select>
            </div>
          </div>
          {original && (
            <div>
              <label className={labelClass}>ΚΑΤΑΣΤΑΣΗ</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as NonNullable<AuthUser['status']>)} className={inputClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-outline px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container">
              Άκυρο
            </button>
            <button type="submit" disabled={!canSubmit} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:cursor-not-allowed disabled:opacity-50">
              <Plus className="h-4 w-4" />
              {original ? 'Αποθήκευση' : 'Πρόσκληση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersView({ users, currentUser, onAddUser, onUpdateUser, canManageUsers }: UsersViewProps) {
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ open: boolean; user: AuthUser | null }>({ open: false, user: null });

  const canManageTarget = (user: AuthUser) => canManageUsers && canManageUserRole(currentUser, user.role);

  // CONTAINS search across name, email, phone, role label and company.
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => {
      const haystack = [user.fullName, user.email, user.phone ?? '', getRoleLabel(user.role), user.companyName]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, users]);

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

  return (
    <div id="users-view" className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
            <Users className="h-5 w-5" />
            Χρήστες
          </h2>
          <p className="mt-1 text-sm text-outline">
            Χρήστες πλατφόρμας και εταιρειών με τους ρόλους και τα στοιχεία επικοινωνίας τους.
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
              }}
              placeholder="Αναζήτηση (όνομα, email, ρόλος…)"
              aria-label="Αναζήτηση χρήστη"
              className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          {canManageUsers && (
            <button
              onClick={() => setEditor({ open: true, user: null })}
              className="flex flex-none items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#0d5c63]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Νέος Χρήστης</span>
              <span className="sm:hidden">Νέος</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-xs font-bold uppercase tracking-wide text-outline">
                <th className="w-16 px-6 py-4">Avatar</th>
                <th className="px-6 py-4">Όνομα / Ρόλος</th>
                <th className="w-32 px-6 py-4">Κατάσταση</th>
                <th className="px-6 py-4">Στοιχεία επικοινωνίας</th>
                {canManageUsers && <th className="w-24 px-6 py-4 text-right">Ενέργειες</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {pageRows.map((user) => {
                const status = user.status ?? 'active';
                return (
                  <tr key={user.id} className="align-top hover:bg-surface-container-low/40">
                    <td className="px-6 py-4">
                      <UserAvatar user={user} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-on-surface">{user.fullName}</div>
                      <div className="mt-0.5 text-xs text-outline">
                        {getRoleLabel(user.role)}
                        {user.companyName ? ` · ${user.companyName}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_META[status].className}`}>
                        {STATUS_META[status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="block max-w-xl select-all whitespace-normal break-words font-mono text-xs text-on-surface-variant">
                        {userMocs(user).join(' | ') || '—'}
                      </span>
                    </td>
                    {canManageUsers && (
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditor({ open: true, user })}
                            disabled={!canManageTarget(user)}
                            className="rounded-lg p-2 text-outline hover:bg-surface-container hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Επεξεργασία ${user.fullName}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onUpdateUser({ ...user, status: status === 'disabled' ? 'active' : 'disabled' })}
                            disabled={!canManageTarget(user)}
                            className="rounded-lg p-2 text-outline hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={status === 'disabled' ? `Ενεργοποίηση ${user.fullName}` : `Απενεργοποίηση ${user.fullName}`}
                            title={status === 'disabled' ? 'Ενεργοποίηση' : 'Απενεργοποίηση'}
                          >
                            {status === 'disabled' ? (
                              <CheckCircle2 className="h-4 w-4 text-teal-600" />
                            ) : (
                              <Ban className="h-4 w-4 hover:text-error" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={canManageUsers ? 5 : 4} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-outline">
                      <Users className="h-10 w-10 text-outline-variant" />
                      <p className="mt-3 text-sm font-semibold text-on-surface-variant">Δεν βρέθηκαν χρήστες</p>
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

      {editor.open && (
        <UserModal
          currentUser={currentUser}
          original={editor.user}
          onClose={() => setEditor({ open: false, user: null })}
          onSubmit={editor.user ? onUpdateUser : onAddUser}
        />
      )}
    </div>
  );
}
