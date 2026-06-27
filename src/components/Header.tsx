import React, { useState, useEffect } from 'react';
import { Bell, Globe, ChevronDown, Clock, LogOut } from 'lucide-react';
import { Property } from '../types';
import { AuthUser, getRoleLabel } from '../lib/auth';
import { useTranslation } from '../lib/i18n';

interface HeaderProps {
  selectedProperty: Property | null;
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export default function Header({
  selectedProperty,
  properties,
  onSelectProperty,
  currentUser,
  onLogout,
  onOpenProfile
}: HeaderProps) {
  const { language, setLanguage, t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep clock updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const mockNotifications = [
    { id: 1, text: 'Νέα κατάθεση 124,50€ για το Α1 (Athenian Court)', time: 'Πριν 5λ', read: false },
    { id: 2, text: 'Βλάβη "Απόφραξη στήλης" μεταφέρθηκε σε εξέλιξη', time: 'Πριν 1ω', read: true },
    { id: 3, text: 'Νέα δαπάνη CleanX (240€) καταχωρήθηκε προς έγκριση', time: 'Πριν 2ω', read: true }
  ];

  return (
    <header id="app-header" className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-6">
      {/* Search / Context */}
      <div className="flex items-center gap-6">
        <div className="relative flex items-center">
          <button
            id="property-selector-btn"
            onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
            className="flex items-center gap-2 rounded-lg border border-outline bg-surface-container-lowest px-4 py-2 text-sm font-medium hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-xl">corporate_fare</span>
            <span>{selectedProperty ? selectedProperty.name : t('header.property')}</span>
            <ChevronDown className="h-4 w-4 text-outline" />
          </button>

          {showPropertyDropdown && (
            <div id="property-selector-menu" className="absolute left-0 top-12 z-50 w-64 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
              <div className="px-3 py-1.5 text-xs font-semibold text-outline">ΕΝΕΡΓΕΣ ΠΟΛΥΚΑΤΟΙΚΙΕΣ</div>
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProperty(p);
                    setShowPropertyDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-surface-container-low ${
                    selectedProperty?.id === p.id ? 'bg-primary/5 text-primary font-medium' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-outline">{p.address}</div>
                  </div>
                  {p.status === 'Published' && (
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">LIVE</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live system clock context */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-on-surface-variant font-mono bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/30">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>{formatDate(currentTime)}</span>
          <span className="font-semibold text-primary">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Action triggers */}
      <div className="flex items-center gap-4">
        {/* Language switch */}
        <div className="language-toggle" aria-label={t('header.language')}>
          <Globe className="h-3.5 w-3.5" />
          <button className={language === 'el' ? 'active' : ''} onClick={() => setLanguage('el')}>GR</button>
          <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>

        {/* Notifications Icon with Badge */}
        <div className="relative">
          <button
            id="notifications-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-full p-2 hover:bg-surface-container"
          >
            <Bell className="h-5 w-5 text-on-surface-variant" />
            <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-secondary"></span>
          </button>

          {showNotifications && (
            <div id="notifications-box" className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
              <div className="border-b border-outline-variant/50 px-3 py-2 font-semibold text-sm">Ειδοποιήσεις</div>
              <div className="divide-y divide-outline-variant/30">
                {mockNotifications.map((n) => (
                  <div key={n.id} className="p-3 text-xs hover:bg-surface-container-low">
                    <div className="flex justify-between font-medium">
                      <span className={n.read ? 'text-on-surface-variant' : 'text-on-surface font-semibold'}>
                        {n.text}
                      </span>
                      <span className="text-[10px] text-outline ml-1">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <span className="h-6 w-px bg-outline-variant"></span>

        {/* Professional Headshot and User Metadata */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-primary">{currentUser.fullName}</div>
            <div className="text-[10px] font-mono text-outline">{getRoleLabel(currentUser.role)}</div>
          </div>
          <button onClick={onOpenProfile} className="rounded-full" title="Το Προφίλ μου" aria-label="Το Προφίλ μου">
            <img
              id="user-profile-img"
              className="h-9 w-9 rounded-full border border-primary object-cover hover:ring-2 hover:ring-primary/20"
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              referrerPolicy="no-referrer"
            />
          </button>
          <button
            onClick={onLogout}
            className="rounded-full p-2 text-outline hover:bg-surface-container hover:text-primary"
            title="Αποσύνδεση"
            aria-label="Αποσύνδεση"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
