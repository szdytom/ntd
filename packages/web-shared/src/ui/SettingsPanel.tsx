import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { defaultLanguage, supportedLanguages, type SupportedLanguage } from '../i18n';
import { setAutoPauseEnabled, useAutoPauseEnabled } from './preferences';
import './SettingsPanel.css';
import { SettingsGlyph } from './SettingsGlyph';

export interface SettingsArchiveRepository { clearAll(): Promise<unknown> }
let settingsArchiveRepository: SettingsArchiveRepository = { clearAll: async () => undefined };
export const configureSettingsArchiveRepository = (repository: SettingsArchiveRepository): void => {
  settingsArchiveRepository = repository;
};

export function SettingsPanel({
  disabled = false,
  defenseArchiveRepository = settingsArchiveRepository,
  onDefenseArchiveCleared,
}: {
  disabled?: boolean;
  defenseArchiveRepository?: SettingsArchiveRepository;
  onDefenseArchiveCleared?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const autoPauseEnabled = useAutoPauseEnabled();
  const [clearState, setClearState] = useState<'idle' | 'armed' | 'clearing' | 'cleared' | 'error'>('idle');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const language = supportedLanguages.find((option) => option === i18n.resolvedLanguage) ?? defaultLanguage;
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setClearState('idle');
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  useEffect(() => {
    if (clearState !== 'armed') return;
    const timeout = window.setTimeout(() => setClearState('idle'), 5_000);
    return () => window.clearTimeout(timeout);
  }, [clearState]);

  const closeSettings = (): void => {
    setOpen(false);
    setClearState('idle');
    triggerRef.current?.focus();
  };

  const chooseLanguage = (option: SupportedLanguage): void => {
    void i18n.changeLanguage(option);
  };

  const clearDefenseArchive = (): void => {
    if (clearState !== 'armed') {
      setClearState('armed');
      return;
    }
    setClearState('clearing');
    void defenseArchiveRepository.clearAll().then(() => {
      setClearState('cleared');
      onDefenseArchiveCleared?.();
    }).catch(() => setClearState('error'));
  };

  return (
    <div className="settings-panel">
      <button
        ref={triggerRef}
        type="button"
        className="settings-trigger"
        aria-label={t('settings.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <SettingsGlyph />
      </button>
      {open ? createPortal(<div className="settings-backdrop" onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        closeSettings();
      }}>
        <div ref={dialogRef} className="settings-dialog" role="dialog" aria-modal="true" aria-label={t('settings.title')}>
          <header>
            <div><SettingsGlyph /><h2>{t('settings.title')}</h2></div>
            <button type="button" className="settings-close" onClick={() => {
              closeSettings();
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
          <section className="settings-section settings-auto-pause-section">
            <div className="settings-section-copy">
              <strong>{t('settings.autoPauseTitle')}</strong>
            </div>
            <div className="auto-pause-options" role="group" aria-label={t('settings.autoPauseTitle')}>
              {[true, false].map((enabled) => (
                <button
                  key={String(enabled)}
                  type="button"
                  aria-pressed={enabled === autoPauseEnabled}
                  onClick={() => setAutoPauseEnabled(enabled)}
                >
                  <span aria-hidden="true">{enabled ? 'Ⅱ' : '▶'}</span>
                  <b>{t(enabled ? 'settings.autoPauseEnabled' : 'settings.autoPauseDisabled')}</b>
                  <i aria-hidden="true">{enabled === autoPauseEnabled ? '✓' : ''}</i>
                </button>
              ))}
            </div>
          </section>
          <section className="settings-section settings-storage-section">
            <div className="settings-section-copy">
              <strong>{t('settings.defenseArchiveTitle')}</strong>
              <span>{t('settings.defenseArchiveDescription')}</span>
            </div>
            <div className="settings-storage-action">
              <button
                type="button"
                className={clearState === 'armed' ? 'armed' : ''}
                disabled={clearState === 'clearing' || clearState === 'cleared'}
                onClick={clearDefenseArchive}
              >{t(clearState === 'armed' ? 'settings.clearDefenseArchiveAgain'
                : clearState === 'clearing' ? 'settings.clearingDefenseArchive'
                  : clearState === 'cleared' ? 'settings.defenseArchiveCleared'
                    : 'defenseArchive.clear')}</button>
              <span role="status" aria-live="polite">{clearState === 'armed' ? t('settings.clearDefenseArchiveWarning')
                : clearState === 'error' ? t('settings.clearDefenseArchiveError') : ''}</span>
            </div>
          </section>
        </div>
      </div>, document.body) : null}
    </div>
  );
}
