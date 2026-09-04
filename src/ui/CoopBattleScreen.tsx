import { useTranslation } from 'react-i18next';
import type { CoopPhaseStart, CoopPlayerId, CoopPlayerSnapshot, CoopRoomSnapshot } from '../coop/types';
import { defenseArchiveRepository } from '../defense-archive';
import type { GameEngine } from '../game/engine';
import { GameSession } from './GameSession';
import { ReinforcementNotice } from './ReinforcementNotice';
import { CoopTeamPanel } from './CoopTeamPanel';
import type { ToastState } from './useGameState';
import styles from './CoopBattleScreen.module.css';

interface CoopBattleScreenProps {
  room: CoopRoomSnapshot;
  playerId: CoopPlayerId;
  self: CoopPlayerSnapshot;
  peer: CoopPlayerSnapshot | null;
  viewedPlayer: CoopPlayerSnapshot | null;
  engine: GameEngine;
  backgroundEngine: GameEngine | undefined;
  availableEngines: Partial<Record<CoopPlayerId, GameEngine>>;
  error: string | null;
  notificationToast: ToastState | null;
  reinforcementNotice: CoopPhaseStart | null;
  onLeave: () => void;
  onOpenThought: (id: string) => void;
  onSetReady: (ready: boolean) => void;
  onTransferShards: (amount: number) => void;
  onViewPlayer: (playerId: CoopPlayerId) => void;
}

export function CoopBattleScreen({
  room,
  playerId,
  self,
  peer,
  viewedPlayer,
  engine,
  backgroundEngine,
  availableEngines,
  error,
  notificationToast,
  reinforcementNotice,
  onLeave,
  onOpenThought,
  onSetReady,
  onTransferShards,
  onViewPlayer,
}: CoopBattleScreenProps) {
  const { t } = useTranslation();
  const planning = room.phase === 'planning';
  const canEdit = planning && !self.ready && !self.eliminated;
  const viewingPeer = Boolean(viewedPlayer && viewedPlayer.id !== playerId);
  const launchDisabled = !planning || self.eliminated;

  return <div className={styles.gameWrap} data-viewed-player={viewedPlayer?.id}>
    <div className={styles.sessionCell}><GameSession
      engine={engine}
      backgroundEngine={backgroundEngine}
      defenseArchive={defenseArchiveRepository}
      notificationToast={notificationToast}
      onExit={onLeave}
      onOpenArchive={() => undefined}
      onOpenThought={onOpenThought}
      onTutorialResolved={() => undefined}
      onLaunch={() => onSetReady(!self.ready)}
      launchDisabled={launchDisabled || viewingPeer}
      launchReady={self.ready}
      workshopEnabled={canEdit && !viewingPeer}
      showTowerLoadouts={viewingPeer}
      battlefieldUtility={{
        id: 'coop-team-console',
        label: t('coop.consoleAction'),
        render: (close) => <CoopTeamPanel
          room={room}
          playerId={playerId}
          self={self}
          peer={peer}
          viewedPlayer={viewedPlayer}
          viewingPeer={viewingPeer}
          canEdit={canEdit}
          error={error}
          canViewPlayer={(candidateId) => Boolean(availableEngines[candidateId])}
          onClose={close}
          onViewPlayer={onViewPlayer}
          onTransferShards={onTransferShards}
        />,
      }}
    /></div>
    {reinforcementNotice ? <ReinforcementNotice signals={reinforcementNotice.signals} /> : null}
  </div>;
}
