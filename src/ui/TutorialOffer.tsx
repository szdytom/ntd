import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPanel } from './SettingsPanel';
import './TutorialOffer.css';

export function TutorialOffer({ onAccept, onDecline }: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('[autofocus]')?.focus();
  }, []);

  const keepFocusInDialog = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onDecline();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="tutorial-offer-backdrop">
      <section
        ref={dialogRef}
        className="tutorial-offer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-offer-title"
        aria-describedby="tutorial-offer-description"
        onKeyDown={keepFocusInDialog}
      >
        <header><span>{t('tutorialOffer.eyebrow')}</span><SettingsPanel /></header>
        <div className="tutorial-offer-copy">
          <h2 id="tutorial-offer-title">{t('tutorialOffer.title')}</h2>
          <p id="tutorial-offer-description">{t('tutorialOffer.body')}</p>
          <small>{t('tutorialOffer.note')}</small>
        </div>
        <footer>
          <button className="tutorial-offer-decline" onClick={onDecline}>{t('tutorialOffer.decline')}</button>
          <button className="tutorial-offer-accept" onClick={onAccept} autoFocus>
            <span>{t('tutorialOffer.accept')}</span><b aria-hidden="true">→</b>
          </button>
        </footer>
      </section>
    </div>
  );
}
