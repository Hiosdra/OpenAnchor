import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { I18N, type I18NTranslations } from '../i18n';

interface I18nContextValue {
  t: I18NTranslations;
  fmt: (template: string, vars: Record<string, string | number>) => string;
  lang: string;
  locale: string;
  setLang: (lang: string) => void;
}

const I18nContext = createContext<I18nContextValue>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(I18N.lang);

  const setLang = useCallback((newLang: string) => {
    I18N.setLang(newLang);
    setLangState(newLang);
  }, []);

  const value: I18nContextValue = {
    t: I18N.translations[lang] || I18N.translations.pl,
    fmt: I18N.fmt.bind(I18N),
    lang,
    locale: lang === 'pl' ? 'pl-PL' : 'en-US',
    setLang,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
