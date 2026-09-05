import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
} as const;

export type SupportedLanguage = keyof typeof resources;
export const supportedLanguages = Object.keys(resources) as SupportedLanguage[];
export const defaultLanguage: SupportedLanguage = 'en';

const isSupportedLanguage = (language: string | null | undefined): language is SupportedLanguage => (
  typeof language === 'string' && Object.hasOwn(resources, language)
);

const resolveInitialLanguage = (): SupportedLanguage => {
  const saved = globalThis.localStorage?.getItem('prism-bastion-language');
  if (isSupportedLanguage(saved)) return saved;
  const browserLanguage = globalThis.navigator?.language;
  if (isSupportedLanguage(browserLanguage)) return browserLanguage;
  const browserBase = browserLanguage?.split('-')[0]?.toLowerCase();
  return supportedLanguages.find((language) => language.split('-')[0]?.toLowerCase() === browserBase)
    ?? defaultLanguage;
};

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLanguage(),
  fallbackLng: defaultLanguage,
  returnNull: false,
  supportedLngs: supportedLanguages,
  keySeparator: false,
  interpolation: { escapeValue: false },
});

const syncDocumentLanguage = (language: string): void => {
  const resolved = supportedLanguages.find((option) => option === language)
    ?? supportedLanguages.find((option) => option.split('-')[0] === language.split('-')[0])
    ?? defaultLanguage;
  if (globalThis.document) document.documentElement.lang = resolved;
  globalThis.localStorage?.setItem('prism-bastion-language', resolved);
};

syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
