import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CoopPlayerId, CoopPlayerSnapshot, CoopRoomSnapshot } from '@prism-bastion/coop/types';
import styles from './CoopTeamPanel.module.css';

interface CoopTeamPanelProps {
  room: CoopRoomSnapshot;
  playerId: CoopPlayerId;
  self: CoopPlayerSnapshot;
  peer: CoopPlayerSnapshot | null;
  viewedPlayer: CoopPlayerSnapshot | null;
  viewingPeer: boolean;
  canEdit: boolean;
  error: string | null;
  canViewPlayer: (playerId: CoopPlayerId) => boolean;
  onClose: () => void;
  onViewPlayer: (playerId: CoopPlayerId) => void;
  onTransferShards: (amount: number) => void;
}

export function CoopTeamPanel({
  room,
  playerId,
  self,
  peer,
  viewedPlayer,
  viewingPeer,
  canEdit,
  error,
  canViewPlayer,
  onClose,
  onViewPlayer,
    onTransferShards,
}: CoopTeamPanelProps) {
  const { t } = useTranslation();
  const [transferAmount, setTransferAmount] = useState(20);

  return <section className={styles.teamPanel} role="dialog" aria-labelledby="coop-team-console-title">
    <header>
      <div><h2 id="coop-team-console-title">{t('coop.consoleTitle')}</h2><p>{t('coop.room')} <b className={styles.code}>{room.code}</b> · {t(`coop.phase.${room.phase}`)}</p></div>
      <button onClick={onClose} aria-label={t('coop.closeConsole')}>×</button>
    </header>
    <div className={styles.teamRoster}>{room.players.map((player) => <section className={player.id === playerId ? styles.localPlayer : styles.peerPlayer} key={player.id}>
      <div className={styles.playerName}><span>{player.id === playerId ? t('coop.you') : t('coop.friend')}</span><strong>{player.name}</strong></div>
      <div className={styles.playerStats}><b><small>{t('coop.core')}</small>♥ {player.plan.core}/{player.plan.maxCore}</b><b><small>{t('coop.shards')}</small>◇ {player.plan.shards}</b></div>
      <p>{player.eliminated ? t('coop.eliminated') : player.combatSubmitted ? t('coop.defenseDone') : player.ready ? t('coop.ready') : player.connected ? t('coop.connected') : t('coop.reconnecting')}</p>
    </section>)}</div>
    {peer && viewedPlayer ? <div className={styles.viewSwitch} data-peer={viewingPeer}>
      <div><small>{t('coop.viewingDefense')}</small><strong>{viewedPlayer.name}</strong></div>
      <button
        aria-pressed={viewingPeer}
        disabled={!canViewPlayer(viewingPeer ? self.id : peer.id)}
        onClick={() => onViewPlayer(viewingPeer ? self.id : peer.id)}
      >{viewingPeer ? t('coop.viewOwnDefense') : t('coop.viewPeerDefense', { name: peer.name })}</button>
    </div> : null}
    {canEdit && peer && !peer.eliminated ? <div className={styles.transfer}>
      <label><span>{t('coop.transfer')}</span><input type="number" min="1" max={self.plan.shards} value={transferAmount} onChange={(event) => setTransferAmount(Number(event.target.value))} /></label>
      <button onClick={() => onTransferShards(Math.max(1, Math.floor(transferAmount)))}>{t('coop.transferAction', { name: peer.name })}</button>
    </div> : null}
    {self.eliminated ? <p className={styles.spectating}>{t('coop.spectating')}</p> : null}
    <details className={styles.pool}>
      <summary><span>{t('coop.sharedPool')}</span><b>＋</b></summary>
      <div className={styles.poolGrid}>{Object.entries(room.pool).filter(([, count]) => count !== 'unlimited').map(([moduleId, count]) => <div key={moduleId}>
        <span>{t(`modules.${moduleId}.name`)}</span><b>{count}</b>
      </div>)}</div>
    </details>
    {error ? <p className={styles.error}>{error}</p> : null}
  </section>;
}
