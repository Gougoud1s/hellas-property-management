import React, { useMemo, useState } from 'react';
import { Building2, CheckCircle2, MailPlus, Search, Shield, UserPlus, Users } from 'lucide-react';
import { AuthUser, canManageUserRole, getRoleLabel, UserRole } from '../lib/auth';
import { Property, TenantRegistrationRequest } from '../types';

interface AdminConsoleViewProps {
  currentUser: AuthUser;
  users: AuthUser[];
  tenantRequests: TenantRegistrationRequest[];
  onInviteUser: (user: AuthUser) => void;
  onUpdateUser: (user: AuthUser) => void;
  onApproveTenantRequest: (requestId: string) => void;
  properties: Property[];
}

const roleOptions: UserRole[] = ['company_admin', 'company_staff', 'owner', 'resident'];

export default function AdminConsoleView({
  currentUser,
  users,
  tenantRequests,
  onInviteUser,
  onUpdateUser,
  onApproveTenantRequest,
  properties
}: AdminConsoleViewProps) {
  const [query, setQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('owner');
  const [invitePropertyIds, setInvitePropertyIds] = useState<string[]>([]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      `${user.fullName} ${user.email} ${getRoleLabel(user.role)}`.toLowerCase().includes(normalized)
    );
  }, [query, users]);

  const canInviteRole = canManageUserRole(currentUser, inviteRole);

  const handleInviteSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteEmail || !inviteName || !canInviteRole) return;

    onInviteUser({
      id: `usr-${Date.now()}`,
      tenantId: currentUser.tenantId,
      fullName: inviteName,
      email: inviteEmail,
      role: inviteRole,
      companyName: currentUser.companyName,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80',
      status: 'invited',
      notificationEmail: true,
      notificationSms: false,
      propertyIds: inviteRole === 'company_staff' || inviteRole === 'owner' || inviteRole === 'resident' ? invitePropertyIds : undefined,
      unitIds: inviteRole === 'owner' || inviteRole === 'resident' ? [] : undefined
    });

    setInviteEmail('');
    setInviteName('');
    setInviteRole('owner');
    setInvitePropertyIds([]);
  };

  return (
    <div id="admin-console-view" className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
              <Shield className="h-5 w-5" />
              Admin Console
            </h2>
            <p className="mt-1 text-sm text-outline">
              Δημιουργία χρηστών, ρόλοι, προσκλήσεις και αιτήματα νέων εταιριών.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
              <div className="text-lg font-black text-primary">{users.length}</div>
              <div className="text-[10px] font-bold uppercase text-outline">Users</div>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
              <div className="text-lg font-black text-secondary">{tenantRequests.filter((request) => request.status === 'pending').length}</div>
              <div className="text-[10px] font-bold uppercase text-outline">Requests</div>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
              <div className="text-lg font-black text-teal-700">{users.filter((user) => user.status !== 'disabled').length}</div>
              <div className="text-[10px] font-bold uppercase text-outline">Active</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Αναζήτηση χρήστη ή ρόλου..."
                className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/50 bg-surface-container-low text-xs font-bold text-outline">
                  <th className="px-6 py-4">ΧΡΗΣΤΗΣ</th>
                  <th className="px-6 py-4">ΡΟΛΟΣ</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4">ΣΥΝΔΕΔΕΜΕΝΑ ΚΤΙΡΙΑ</th>
                  <th className="px-6 py-4 text-right">ΕΝΕΡΓΕΙΑ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredUsers.map((user) => {
                  const canEdit = canManageUserRole(currentUser, user.role);
                  return (
                    <tr key={user.id} className="hover:bg-surface-container-low/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img className="h-9 w-9 rounded-full object-cover" src={user.avatarUrl} alt={user.fullName} />
                          <div>
                            <div className="font-bold text-on-surface">{user.fullName}</div>
                            <div className="text-xs text-outline">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          disabled={!canEdit}
                          onChange={(event) => onUpdateUser({ ...user, role: event.target.value as UserRole })}
                          className="rounded border border-outline bg-surface-container-lowest px-2 py-1 text-xs font-semibold outline-none disabled:opacity-60"
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role} disabled={!canManageUserRole(currentUser, role)}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.status === 'invited'
                            ? 'bg-amber-50 text-amber-700'
                            : user.status === 'disabled'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-teal-50 text-teal-700'
                        }`}>
                          {user.status === 'invited' ? 'Πρόσκληση' : user.status === 'disabled' ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-outline">
                        {user.role === 'company_staff' ? (
                          <details className="relative">
                            <summary className="cursor-pointer font-semibold text-primary">{user.propertyIds?.length ? `${user.propertyIds.length} κτίρια` : 'Όλα τα κτίρια'}</summary>
                            <div className="absolute right-0 z-20 mt-2 w-64 space-y-1 rounded-lg border border-outline-variant bg-white p-3 shadow-xl">
                              {properties.map((property) => <label key={property.id} className="flex min-h-9 items-center gap-2 text-xs"><input type="checkbox" checked={user.propertyIds?.includes(property.id) ?? false} onChange={() => { const current = user.propertyIds ?? []; const next = current.includes(property.id) ? current.filter((id) => id !== property.id) : [...current, property.id]; onUpdateUser({ ...user, propertyIds: next }); }} /> <span className="truncate">{property.name}</span></label>)}
                            </div>
                          </details>
                        ) : user.propertyIds?.length ? user.propertyIds.map((id) => properties.find((property) => property.id === id)?.name || id).join(', ') : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={!canEdit}
                          onClick={() => onUpdateUser({ ...user, status: user.status === 'disabled' ? 'active' : 'disabled' })}
                          className="rounded border border-outline px-3 py-1.5 text-xs font-bold hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {user.status === 'disabled' ? 'Ενεργοποίηση' : 'Απενεργοποίηση'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleInviteSubmit} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase text-primary">
              <MailPlus className="h-4 w-4" />
              Πρόσκληση χρήστη
            </h3>
            <div className="mt-4 space-y-3">
              <input
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Ονοματεπώνυμο"
                className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="email@example.gr"
                type="email"
                className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as UserRole)}
                className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role} disabled={!canManageUserRole(currentUser, role)}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
              {(inviteRole === 'company_staff' || inviteRole === 'owner' || inviteRole === 'resident') && (
                <fieldset className="rounded-lg border border-outline-variant p-3">
                  <legend className="px-1 text-[10px] font-black uppercase text-outline">Συνδεδεμένες πολυκατοικίες</legend>
                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                    {properties.map((property) => (
                      <label key={property.id} className="flex min-h-9 items-center gap-2 text-xs font-semibold">
                        <input type="checkbox" checked={invitePropertyIds.includes(property.id)} onChange={() => setInvitePropertyIds((prev) => prev.includes(property.id) ? prev.filter((id) => id !== property.id) : [...prev, property.id])} />
                        <span className="truncate">{property.name}</span>
                      </label>
                    ))}
                  </div>
                  {inviteRole === 'company_staff' && invitePropertyIds.length === 0 && <p className="mt-2 text-[10px] text-outline">Χωρίς επιλογή, ο συνεργάτης έχει πρόσβαση σε όλα τα κτίρια.</p>}
                </fieldset>
              )}
              {!canInviteRole && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Ο ρόλος σας δεν μπορεί να προσκαλέσει αυτόν τον τύπο χρήστη.
                </p>
              )}
              <button
                disabled={!canInviteRole}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0d5c63] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Αποστολή Πρόσκλησης
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase text-primary">
              <Building2 className="h-4 w-4" />
              Tenant Requests
            </h3>
            <div className="mt-4 space-y-3">
              {tenantRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-on-surface">{request.companyName}</div>
                      <div className="text-xs text-outline">{request.contactName} · {request.city}</div>
                      <div className="mt-1 text-xs font-mono text-outline">{request.email}</div>
                    </div>
                    <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                      {request.status}
                    </span>
                  </div>
                  {request.status === 'pending' && currentUser.role === 'company_admin' && (
                    <button
                      onClick={() => onApproveTenantRequest(request.id)}
                      className="mt-3 flex w-full items-center justify-center gap-1 rounded bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Έγκριση / Δημιουργία Tenant
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase text-primary">
              <Users className="h-4 w-4" />
              Κανόνας V1
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
              Τα νέα tenants δημιουργούνται από αίτημα και έγκριση. Οι χρήστες μπαίνουν μέσω πρόσκλησης από εταιρικό admin ή staff, ανάλογα με τα δικαιώματα.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
