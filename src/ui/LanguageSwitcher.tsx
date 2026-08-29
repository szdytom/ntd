import { useTranslation } from 'react-i18next';
import { defaultLanguage, supportedLanguages, type SupportedLanguage } from '../i18n';
import './LanguageSwitcher.css';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const language = supportedLanguages.find((option) => option === i18n.resolvedLanguage) ?? defaultLanguage;
  return (
    <label className="language-switcher">
      <span className="language-switcher-icon" aria-hidden="true">◎</span>
      <select
        aria-label={t('common.language')}
        value={language}
        onChange={(event) => void i18n.changeLanguage(event.target.value as SupportedLanguage)}
      >
        {supportedLanguages.map((option) => (
          <option key={option} value={option}>{i18n.getFixedT(option)('lang.name')}</option>
        ))}
      </select>
      <span className="language-switcher-chevron" aria-hidden="true">⌄</span>
    </label>
  );
}
