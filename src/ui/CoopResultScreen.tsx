import { useTranslation } from 'react-i18next';
import type { CoopRoomSnapshot } from '../coop/types';
import { CoopLinkMark } from './CoopLinkMark';
import { SettingsPanel } from './SettingsPanel';
import styles from './CoopResultScreen.module.css';

interface CoopResultScreenProps {
  room: CoopRoomSnapshot;
  onLeave: () => void;
}

export function CoopResultScreen({ room, onLeave }: CoopResultScreenProps) {
  const { t } = useTranslation();

  return <main className={styles.stageShell}><section className={`${styles.resultConsole} ${room.result === 'victory' ? styles.victory : styles.defeat}`}>
    <div className={`${styles.screenSettings} ${styles.resultSettings}`}><SettingsPanel /></div>
    <div className={styles.resultCopy}>
      <div className={styles.resultText}><p className={styles.eyebrow}>{t('coop.result')}</p><h1>{t(`coop.result.${room.result ?? 'defeat'}`)}</h1><span>{t('coop.room')} <b className={styles.code}>{room.code}</b></span></div>
      <CoopLinkMark className={styles.resultLink} variant="result" />
    </div>
    <button onClick={onLeave}>{t('coop.return')}</button>
  </section></main>;
}
