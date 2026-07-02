import React from 'react';
import { AuthUser, canAccessTab, getRoleLabel } from '../lib/auth';
import { useTranslation } from '../lib/i18n';

export type ActiveTab = 'dashboard' | 'admin' | 'properties' | 'units' | 'expenses' | 'rules' | 'statements' | 'invoicing' | 'assemblies' | 'issues' | 'bank' | 'docs' | 'profile';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  brandName: string;
  currentUser: AuthUser;
}

interface MenuItem {
  id: ActiveTab;
  label: string;
  icon: string;
  badge?: string | number;
}

export default function Sidebar({ activeTab, setActiveTab, brandName, currentUser }: SidebarProps) {
  const { t } = useTranslation();

  // Primary navigation — the product surfaces. Settings/profile lives pinned at
  // the bottom, so it is intentionally excluded from this list.
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'space_dashboard' },
    { id: 'admin', label: t('nav.admin'), icon: 'admin_panel_settings' },
    { id: 'properties', label: t('nav.properties'), icon: 'corporate_fare' },
    { id: 'units', label: t('nav.units'), icon: 'home_work' },
    { id: 'expenses', label: t('nav.expenses'), icon: 'receipt_long' },
    { id: 'rules', label: t('nav.rules'), icon: 'rule' },
    { id: 'statements', label: t('nav.statements'), icon: 'table_chart' },
    { id: 'invoicing', label: t('nav.invoicing'), icon: 'receipt' },
    { id: 'assemblies', label: t('nav.assemblies'), icon: 'how_to_vote' },
    { id: 'issues', label: t('nav.issues'), icon: 'handyman', badge: 2 },
    { id: 'bank', label: t('nav.bank'), icon: 'account_balance_wallet' },
    { id: 'docs', label: t('nav.docs'), icon: 'folder_open' }
  ];
  const visibleMenuItems = menuItems.filter((item) => canAccessTab(currentUser, item.id));
  const homeTab = visibleMenuItems[0]?.id ?? 'profile';
  const settingsActive = activeTab === 'profile';

  return (
    <aside id="app-sidebar" className="app-sidebar fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-outline-variant bg-[#004349] text-white">
      {/* Top — Platform Logo */}
      <div className="h-16 border-b border-white/10 px-4">
        <button
          type="button"
          onClick={() => setActiveTab(homeTab)}
          aria-label={t('nav.home')}
          className="flex h-full w-full items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-inverse-primary text-2xl">apartment</span>
          <span className="flex flex-col">
            <span className="font-sans text-base font-extrabold uppercase tracking-wide text-white">
              {brandName}
            </span>
            <span className="font-mono text-[10px] font-medium tracking-widest text-[#90d2da]">
              B2B PORTAL
            </span>
          </span>
        </button>
      </div>

      {/* Middle — Navigation menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label={t('nav.dashboard')}>
        {visibleMenuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                isActive
                  ? 'border-l-4 border-inverse-primary bg-[#0d5c63] font-semibold text-[#90d2da]'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${
                    isActive ? 'text-inverse-primary' : 'text-white/60 group-hover:text-white'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-sm tracking-wide">{item.label}</span>
              </span>

              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.id === 'bank' ? 'bg-secondary text-white' : 'bg-white/20 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom — Settings + signature */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={() => setActiveTab('profile')}
          aria-current={settingsActive ? 'page' : undefined}
          className={`group mb-3 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all duration-200 ${
            settingsActive
              ? 'border-l-4 border-inverse-primary bg-[#0d5c63] font-semibold text-[#90d2da]'
              : 'text-white/80 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span
            className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${
              settingsActive ? 'text-inverse-primary' : 'text-white/60 group-hover:text-white'
            }`}
          >
            settings
          </span>
          <span className="text-sm tracking-wide">{t('nav.settings')}</span>
        </button>

        <div className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-left">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#90d2da]">Ρόλος</div>
          <div className="mt-1 text-xs font-semibold text-white">{getRoleLabel(currentUser.role)}</div>
        </div>
        <div className="text-center font-mono text-[10px] text-white/50">
          © 2026 Hellas Property Management
        </div>
        <div className="mt-1 text-center font-sans text-[9px] font-medium text-[#90d2da]">
          Έκδοση 4.2.0 • Cloud Ingress Active
        </div>
      </div>
    </aside>
  );
}
