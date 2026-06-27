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
    { id: 'docs', label: t('nav.docs'), icon: 'folder_open' },
    { id: 'profile', label: t('nav.profile'), icon: 'account_circle' }
  ];
  const visibleMenuItems = menuItems.filter((item) => canAccessTab(currentUser, item.id));

  return (
    <aside id="app-sidebar" className="app-sidebar fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-outline-variant bg-[#004349] text-white">
      {/* Brand Title */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
        <span className="material-symbols-outlined text-inverse-primary text-2xl">apartment</span>
        <div className="flex flex-col">
          <span className="font-sans text-base font-extrabold tracking-wide text-white uppercase">
            {brandName}
          </span>
          <span className="text-[10px] tracking-widest text-[#90d2da] font-medium font-mono">
            B2B PORTAL
          </span>
        </div>
      </div>

      {/* Menu Options */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                isActive
                  ? 'bg-[#0d5c63] text-[#90d2da] font-semibold border-l-4 border-inverse-primary'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${
                    isActive ? 'text-inverse-primary' : 'text-white/60 group-hover:text-white'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-sm tracking-wide">{item.label}</span>
              </div>
              
              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.id === 'bank'
                      ? 'bg-secondary text-white'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Signature */}
      <div className="border-t border-white/10 p-4 text-center">
        <div className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-left">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#90d2da]">Ρόλος</div>
          <div className="mt-1 text-xs font-semibold text-white">{getRoleLabel(currentUser.role)}</div>
        </div>
        <div className="text-[10px] text-white/50 font-mono">
          © 2026 Hellas Property Management
        </div>
        <div className="mt-1 text-[9px] text-[#90d2da] font-sans font-medium">
          Έκδοση 4.2.0 • Cloud Ingress Active
        </div>
      </div>
    </aside>
  );
}
