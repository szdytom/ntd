import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LEVELS, TUTORIAL_LEVEL_ID } from '@prism-bastion/game-core/game/config';
import { DIFFICULTIES } from '@prism-bastion/game-core/game/difficulty';
import type { DifficultyId } from '@prism-bastion/game-core/game/types';
import { Toast } from '@prism-bastion/web-shared/ui/Toast';
import type { ToastState } from '@prism-bastion/web-shared/ui/useGameState';
import { CoopLinkMark } from './CoopLinkMark';
import { SettingsPanel } from '@prism-bastion/web-shared/ui/SettingsPanel';
import type { CoopConnectionStatus } from './useCoopRuntime';
import styles from './CoopEntryScreen.module.css';

const eligibleLevels = LEVELS.filter((level) => level.id !== TUTORIAL_LEVEL_ID);

interface CoopEntryScreenProps {
  connection: CoopConnectionStatus;
  error: string | null;
  onCreateRoom: (options: { name: string; levelId: string; difficultyId: DifficultyId }) => void;
  onJoinRoom: (options: { name: string; code: string }) => void;
  onBack: () => void;
}

export function CoopEntryScreen({ connection, error, onCreateRoom, onJoinRoom, onBack }: CoopEntryScreenProps) {
  const { t } = useTranslation();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(() => localStorage.getItem('prism-bastion-coop-name') ?? '');
  const [code, setCode] = useState('');
  const [levelId, setLevelId] = useState<string>(eligibleLevels[0]?.id ?? 'white-prism');
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('normal');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const requireName = (): boolean => {
    if (name.trim()) {
      setNameInvalid(false);
      return true;
    }
    setNameInvalid(true);
    setToast({ message: t('coop.nameRequired'), tone: 'warn', nonce: Date.now() });
    nameInputRef.current?.focus();
    return false;
  };

  const createRoom = (): void => {
    if (!requireName()) return;
    onCreateRoom({ name, levelId, difficultyId });
  };

  const joinRoom = (): void => {
    if (!requireName()) return;
    onJoinRoom({ name, code });
  };

  return <>
    <main className={styles.entryShell}>
      <section className={styles.entryConsole}>
        <header className={styles.entryIdentity}>
          <p className={styles.eyebrow}>{t('coop.eyebrow')}</p>
          <h1>{t('coop.title')}</h1>
          <p className={styles.intro}>{t('coop.intro')}</p>
          <CoopLinkMark className={styles.entryMark} />
          <p className={styles.voiceNote}>{t('coop.voiceNote')}</p>
        </header>
        <div className={styles.entryOperations}>
          <div className={styles.entryTopbar}>
            <label className={styles.nameField}><span>{t('coop.name')}</span><input ref={nameInputRef} value={name} maxLength={20} aria-invalid={nameInvalid} data-invalid={nameInvalid || undefined} onChange={(event) => { setName(event.target.value); if (event.target.value.trim()) setNameInvalid(false); }} /></label>
            <button className={styles.backButton} type="button" onClick={onBack}><span aria-hidden="true">←</span>{t('coop.singlePlayer')}</button>
            <div className={styles.screenSettings}><SettingsPanel /></div>
          </div>
          <section className={styles.createPanel}>
            <p className={styles.panelLabel}>{t('coop.host')}</p>
            <h2>{t('coop.create')}</h2>
            <label>{t('coop.level')}<select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
              {eligibleLevels.map((level) => <option key={level.id} value={level.id}>{t(`levels.${level.id}.name`)}</option>)}
            </select></label>
            <label>{t('coop.difficulty')}<select value={difficultyId} onChange={(event) => setDifficultyId(event.target.value as DifficultyId)}>
              {DIFFICULTIES.map((difficulty) => <option key={difficulty.id} value={difficulty.id}>{t(`difficulties.${difficulty.id}.name`)}</option>)}
            </select></label>
            <button disabled={connection === 'connecting'} onClick={createRoom}>{t('coop.createAction')}</button>
          </section>
          <section className={styles.joinPanel}>
            <p className={styles.panelLabel}>{t('coop.friend')}</p>
            <h2>{t('coop.join')}</h2>
            <label>{t('coop.code')}<input value={code} maxLength={6} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
            <button disabled={code.trim().length !== 6 || connection === 'connecting'} onClick={joinRoom}>{t('coop.joinAction')}</button>
          </section>
          <footer className={styles.entryFooter}>
            <p className={styles.status} data-state={connection}><span aria-hidden="true" />{t(`coop.connection.${connection}`)}</p>
          </footer>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </div>
      </section>
    </main>
    <Toast toast={toast} />
  </>;
}
