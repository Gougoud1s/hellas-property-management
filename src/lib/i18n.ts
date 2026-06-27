import { useEffect, useState } from 'react';
import { translations, TranslationKey } from './translations';

export type Language = 'el' | 'en';
const STORAGE_KEY = 'hpm_lang';
const EVENT_NAME = 'hpm-language-change';

export function getLanguage(): Language {
  return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'el';
}

export function setLanguage(language: Language) {
  localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: language }));
}

export function useTranslation() {
  const [language, updateLanguage] = useState<Language>(getLanguage);

  useEffect(() => {
    const handler = (event: Event) => updateLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener(EVENT_NAME, handler);
    document.documentElement.lang = language;
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [language]);

  return {
    language,
    setLanguage,
    t: (key: TranslationKey) => translations[key][language]
  };
}
