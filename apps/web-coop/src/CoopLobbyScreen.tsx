import { useTranslation } from 'react-i18next';
import type { CoopPlayerId, CoopPlayerSnapshot, CoopRoomSnapshot } from '@prism-bastion/coop/types';
import { CoopLinkMark } from './CoopLinkMark';
import { SettingsPanel } from '@prism-bastion/web-shared/ui/SettingsPanel';
import styles from './CoopLobbyScreen.module.css';

interface CoopLobbyScreenProps {
  room: CoopRoomSnapshot;
  playerId: CoopPlayerId;
  self: CoopPlayerSnapshot;
  peer: CoopPlayerSnapshot | null;
  error: string | null;
  onLeave: () => void;
  onSetReady: (ready: boolean) => void;
}

export function CoopLobbyScreen({ room, playerId, self, peer, error, onLeave, onSetReady }: CoopLobbyScreenProps) {
  const { t } = useTranslation();
  const lobbyPlayers = [self, peer];

  return <main className={styles.stageShell}><section className={styles.stageConsole}>
    <header className={styles.roomMasthead}>
      <div className={styles.roomBadge}><p>{t('coop.roomCode')}</p><h1 className={styles.code}>{room.code}</h1></div>
      <div className={styles.stageHeading}><p className={styles.eyebrow}>{t('coop.phase.lobby')}</p><h2>{t('coop.lobbyTitle')}</h2><span>{t('coop.shareCode')}</span></div>
      <div className={styles.screenSettings}><SettingsPanel /></div>
      <button className={styles.leaveButton} onClick={onLeave}>{t('coop.leave')}</button>
    </header>
    <div className={styles.endpointDeck}>
      <CoopLinkMark className={styles.lobbyLink} active={Boolean(peer)} variant="lobby" />
      {lobbyPlayers.map((player) => player ? <section className={`${styles.endpoint} ${player.id === playerId ? styles.localEndpoint : styles.peerEndpoint}`} key={player.id}>
        <p className={styles.endpointLabel}>{player.id === playerId ? t('coop.you') : t('coop.friend')}</p>
        <h3>{player.name}</h3>
        <div className={styles.endpointState}><span>{player.connected ? t('coop.connected') : t('coop.reconnecting')}</span><b data-ready={player.ready}>{player.ready ? t('coop.ready') : t('coop.notReady')}</b></div>
      </section> : <section className={`${styles.endpoint} ${styles.emptyEndpoint}`} key="empty">
        <p className={styles.endpointLabel}>{t('coop.friend')}</p>
        <h3>{t('coop.waitingEndpoint')}</h3>
      </section>)}
    </div>
    <footer className={styles.readyDock}>
      <div><strong>{peer ? t('coop.syncLinked') : t('coop.syncWaiting')}</strong><span>{t('coop.readyHint')}</span></div>
      <button disabled={room.players.length < 2 || !self.connected} onClick={() => onSetReady(!self.ready)}>
        {self.ready ? t('coop.cancelReady') : t('coop.readyAction')}
      </button>
    </footer>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section></main>;
}
