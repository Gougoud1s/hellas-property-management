import React, { useState, useEffect, useRef } from 'react';
import { Bell, Globe, ChevronDown, Clock, LogOut, LayoutGrid, Building2 } from 'lucide-react';
import { Property } from '../types';
import { AuthUser, getRoleLabel } from '../lib/auth';
import { useTranslation } from '../lib/i18n';

interface HeaderProps {
  selectedProperty: Property | null;
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  currentUser: AuthUser;
  brandName: string;
  onLogout: () => void;
  onOpenProfile: () => void;
}

type OpenMenu = 'notifications' | 'property' | 'platform' | 'tenant' | null;

export default function Header({
  selectedProperty,
  properties,
  onSelectProperty,
  currentUser,
  brandName,
  onLogout,
  onOpenProfile
}: HeaderProps) {
  const { language, setLanguage, t } = useTranslation();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const headerRef = useRef<HTMLElement>(null);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) =>
    setOpenMenu((prev) => (prev === menu ? null : menu));

  // Keep clock updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close any open menu on outside click or Escape
  useEffect(() => {
    if (!openMenu) return;
    const handlePointer = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenu]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('el-GR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const tenantInitials = currentUser.companyName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const mockNotifications = [
    { id: 1, text: 'Νέα κατάθεση 124,50€ για το Α1 (Athenian Court)', time: 'Πριν 5λ', read: false },
    { id: 2, text: 'Βλάβη "Απόφραξη στήλης" μεταφέρθηκε σε εξέλιξη', time: 'Πριν 1ω', read: true },
    { id: 3, text: 'Νέα δαπάνη CleanX (240€) καταχωρήθηκε προς έγκριση', time: 'Πριν 2ω', read: true }
  ];

  return (
    <header ref={headerRef} id="app-header" className="sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-4 border-b border-outline-variant bg-surface px-6">
      {/* LEFT — working context (property selector) */}
      <div className="flex min-w-0 items-center">
        <div className="relative flex items-center">
          <button
            id="property-selector-btn"
            onClick={() => toggleMenu('property')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'property'}
            className="flex items-center gap-2 rounded-lg border border-outline bg-surface-container-lowest px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-xl text-primary">corporate_fare</span>
            <span className="max-w-[180px] truncate">{selectedProperty ? selectedProperty.name : t('header.property')}</span>
            <ChevronDown className={`h-4 w-4 text-outline transition-transform ${openMenu === 'property' ? 'rotate-180' : ''}`} />
          </button>

          {openMenu === 'property' && (
            <div id="property-selector-menu" className="absolute left-0 top-12 z-50 w-64 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
              <div className="px-3 py-1.5 text-xs font-semibold text-outline">ΕΝΕΡΓΕΣ ΠΟΛΥΚΑΤΟΙΚΙΕΣ</div>
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProperty(p);
                    setOpenMenu(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-surface-container-low ${
                    selectedProperty?.id === p.id ? 'bg-primary/5 font-medium text-primary' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-outline">{p.address}</span>
                  </span>
                  {p.status === 'Published' && (
                    <span className="ml-2 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">LIVE</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE — live system clock */}
      <div className="hidden flex-1 items-center justify-center lg:flex">
        <div className="flex items-center gap-3 rounded-full border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 font-mono text-xs text-on-surface-variant">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>{formatDate(currentTime)}</span>
          <span className="font-semibold text-primary">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* RIGHT — platform menu, tenant menu, user profile */}
      <div className="flex items-center gap-3">
        {/* Language switch */}
        <div className="language-toggle" aria-label={t('header.language')}>
          <Globe className="h-3.5 w-3.5" />
          <button className={language === 'el' ? 'active' : ''} onClick={() => setLanguage('el')}>GR</button>
          <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifications-bell"
            onClick={() => toggleMenu('notifications')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'notifications'}
            aria-label="Ειδοποιήσεις"
            className="relative rounded-full p-2 hover:bg-surface-container"
          >
            <Bell className="h-5 w-5 text-on-surface-variant" />
            <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-secondary"></span>
          </button>

          {openMenu === 'notifications' && (
            <div id="notifications-box" className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
              <div className="border-b border-outline-variant/50 px-3 py-2 text-sm font-semibold">Ειδοποιήσεις</div>
              <div className="divide-y divide-outline-variant/30">
                {mockNotifications.map((n) => (
                  <div key={n.id} className="p-3 text-xs hover:bg-surface-container-low">
                    <div className="flex justify-between font-medium">
                      <span className={n.read ? 'text-on-surface-variant' : 'font-semibold text-on-surface'}>{n.text}</span>
                      <span className="ml-1 text-[10px] text-outline">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <span className="hidden h-6 w-px bg-outline-variant sm:block"></span>

        {/* Platform menu */}
        <div className="relative hidden sm:block">
          <button
            id="platform-menu-btn"
            onClick={() => toggleMenu('platform')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'platform'}
            title={t('header.platform')}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-surface-container"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <LayoutGrid className="h-4 w-4" />
            </span>
            <ChevronDown className={`h-4 w-4 text-outline transition-transform ${openMenu === 'platform' ? 'rotate-180' : ''}`} />
          </button>

          {openMenu === 'platform' && (
            <div id="platform-menu" className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
              <div className="flex items-center gap-3 rounded-md bg-primary/5 px-3 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <span className="material-symbols-outlined text-xl">apartment</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-primary">{brandName}</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-outline">B2B PORTAL</span>
                </span>
              </div>
              <div className="px-3 py-2 text-[11px] font-mono text-outline">Έκδοση 4.2.0</div>
              <div className="my-1 border-t border-outline-variant/50"></div>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-surface-container-low"
              >
                <LogOut className="h-4 w-4 text-outline" />
                {t('header.logout')}
              </button>
            </div>
          )}
        </div>

        {/* Tenant menu */}
        <div className="relative hidden sm:block">
          <button
            id="tenant-menu-btn"
            onClick={() => toggleMenu('tenant')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'tenant'}
            title={t('header.tenant')}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-surface-container"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-black text-white">
              {tenantInitials}
            </span>
            <span className="hidden max-w-[140px] truncate text-sm font-semibold text-on-surface xl:block">
              {currentUser.companyName}
            </span>
            <ChevronDown className={`h-4 w-4 text-outline transition-transform ${openMenu === 'tenant' ? 'rotate-180' : ''}`} />
          </button>

          {openMenu === 'tenant' && (
            <div id="tenant-menu" className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
              <div className="flex items-center gap-3 rounded-md bg-secondary/5 px-3 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-black text-white">
                  {tenantInitials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-on-surface">{currentUser.companyName}</span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-outline">
                    <Building2 className="h-3 w-3" />
                    {currentUser.tenantId}
                  </span>
                </span>
              </div>
              <div className="px-3 py-2 text-xs text-on-surface-variant">
                Σύνδεση ως <span className="font-semibold text-primary">{getRoleLabel(currentUser.role)}</span>
              </div>
              <div className="my-1 border-t border-outline-variant/50"></div>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-surface-container-low"
              >
                <LogOut className="h-4 w-4 text-outline" />
                {t('header.logout')}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <span className="h-6 w-px bg-outline-variant"></span>

        {/* User profile (opens profile page) */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-primary">{currentUser.fullName}</div>
            <div className="font-mono text-[10px] text-outline">{getRoleLabel(currentUser.role)}</div>
          </div>
          <button onClick={onOpenProfile} className="rounded-full" title={t('header.profile')} aria-label={t('header.profile')}>
            <img
              id="user-profile-img"
              className="h-9 w-9 rounded-full border border-primary object-cover hover:ring-2 hover:ring-primary/20"
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              referrerPolicy="no-referrer"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
