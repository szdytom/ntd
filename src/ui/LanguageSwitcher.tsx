import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { defaultLanguage, supportedLanguages, type SupportedLanguage } from '../i18n';
import './LanguageSwitcher.css';

export function LanguageSwitcher({ disabled = false }: { disabled?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const language = supportedLanguages.find((option) => option === i18n.resolvedLanguage) ?? defaultLanguage;
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const chooseLanguage = (option: SupportedLanguage): void => {
    void i18n.changeLanguage(option);
  };

  return (
    <div className="language-switcher">
      <button
        ref={triggerRef}
        type="button"
        className="language-trigger"
        aria-label={t('settings.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="settings-glyph" aria-hidden="true">⚙</span>
      </button>
      {open ? createPortal(<div className="settings-backdrop" onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        setOpen(false);
        triggerRef.current?.focus();
      }}>
        <div ref={dialogRef} className="settings-dialog" role="dialog" aria-modal="true" aria-label={t('settings.title')}>
          <header>
            <div><span className="settings-glyph" aria-hidden="true">⚙</span><h2>{t('settings.title')}</h2></div>
            <button type="button" className="settings-close" onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }} aria-label={t('settings.close')}>×</button>
          </header>
          <section className="settings-section">
            <div className="settings-section-copy">
              <strong>{t('common.language')}</strong>
              <span>{t('settings.languageDescription')}</span>
            </div>
            <div className="language-options">
              {supportedLanguages.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === language}
                  onClick={() => chooseLanguage(option)}
                >
                  <span aria-hidden="true">{i18n.getFixedT(option)('settings.languageIcon')}</span>
                  <b>{i18n.getFixedT(option)('lang.name')}</b>
                  <i aria-hidden="true">{option === language ? '✓' : ''}</i>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>, document.body) : null}
    </div>
  );
}
