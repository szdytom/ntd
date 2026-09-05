import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LEVELS, TUTORIAL_LEVEL_ID } from '@prism-bastion/game-core/game/config';
import { DIFFICULTIES } from '@prism-bastion/game-core/game/difficulty';
import type { DifficultyId } from '@prism-bastion/game-core/game/types';
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
  const [name, setName] = useState(() => localStorage.getItem('prism-bastion-coop-name') ?? 'Player');
  const [code, setCode] = useState('');
  const [levelId, setLevelId] = useState<string>(eligibleLevels[0]?.id ?? 'white-prism');
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('normal');

  return <main className={styles.entryShell}>
    <section className={styles.entryConsole}>
      <div className={`${styles.screenSettings} ${styles.entrySettings}`}><SettingsPanel /></div>
      <header className={styles.entryIdentity}>
        <p className={styles.eyebrow}>{t('coop.eyebrow')}</p>
        <h1>{t('coop.title')}</h1>
        <p className={styles.intro}>{t('coop.intro')}</p>
        <CoopLinkMark className={styles.entryMark} />
        <p className={styles.voiceNote}>{t('coop.voiceNote')}</p>
      </header>
      <div className={styles.entryOperations}>
        <label className={styles.nameField}><span>{t('coop.name')}</span><input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} /></label>
        <section className={styles.createPanel}>
          <p className={styles.panelLabel}>{t('coop.host')}</p>
          <h2>{t('coop.create')}</h2>
          <label>{t('coop.level')}<select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
            {eligibleLevels.map((level) => <option key={level.id} value={level.id}>{t(`levels.${level.id}.name`)}</option>)}
          </select></label>
          <label>{t('coop.difficulty')}<select value={difficultyId} onChange={(event) => setDifficultyId(event.target.value as DifficultyId)}>
            {DIFFICULTIES.map((difficulty) => <option key={difficulty.id} value={difficulty.id}>{t(`difficulties.${difficulty.id}.name`)}</option>)}
          </select></label>
          <button disabled={!name.trim() || connection === 'connecting'} onClick={() => onCreateRoom({ name, levelId, difficultyId })}>{t('coop.createAction')}</button>
        </section>
        <section className={styles.joinPanel}>
          <p className={styles.panelLabel}>{t('coop.friend')}</p>
          <h2>{t('coop.join')}</h2>
          <label>{t('coop.code')}<input value={code} maxLength={6} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
          <button disabled={!name.trim() || code.trim().length !== 6 || connection === 'connecting'} onClick={() => onJoinRoom({ name, code })}>{t('coop.joinAction')}</button>
        </section>
        <footer className={styles.entryFooter}>
          <p className={styles.status} data-state={connection}><span aria-hidden="true" />{t(`coop.connection.${connection}`)}</p>
          <button type="button" onClick={onBack}>{t('coop.singlePlayer')}</button>
        </footer>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </section>
  </main>;
}
