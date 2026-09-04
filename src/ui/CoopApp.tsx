import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ThoughtIndex } from './ThoughtIndex';
import { CoopBattleScreen } from './CoopBattleScreen';
import { CoopDraftScreen } from './CoopDraftScreen';
import { CoopEntryScreen } from './CoopEntryScreen';
import { CoopLobbyScreen } from './CoopLobbyScreen';
import { CoopResultScreen } from './CoopResultScreen';
import { useCoopRuntime } from './useCoopRuntime';
import styles from './CoopApp.module.css';

export function CoopApp() {
  const runtime = useCoopRuntime();
  const thoughtOriginRef = useRef<HTMLElement | null>(null);
  const [thoughtOpen, setThoughtOpen] = useState<{ id: string } | null>(null);
  const { room, playerId } = runtime;
  const self = room?.players.find((player) => player.id === playerId) ?? null;
  const peer = room?.players.find((player) => player.id !== playerId) ?? null;
  const viewedPlayer = room?.players.find((player) => player.id === runtime.viewedPlayerId) ?? self;
  const backgroundPlayerId = room?.players.find((player) => player.id !== viewedPlayer?.id)?.id;
  const backgroundEngine = backgroundPlayerId ? runtime.engines[backgroundPlayerId] : undefined;
  const revision = room?.revision ?? 0;

  useEffect(() => {
    if (!room) setThoughtOpen(null);
  }, [room]);

  const openThought = (id: string): void => {
    thoughtOriginRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (runtime.viewedPlayerId) runtime.engines[runtime.viewedPlayerId]?.setAutoPauseCondition('thought-index', true);
    setThoughtOpen({ id });
  };

  const closeThought = (): void => {
    if (runtime.viewedPlayerId) runtime.engines[runtime.viewedPlayerId]?.setAutoPauseCondition('thought-index', false);
    setThoughtOpen(null);
    requestAnimationFrame(() => thoughtOriginRef.current?.focus());
  };

  const leaveRoom = (): void => {
    setThoughtOpen(null);
    runtime.leaveRoom();
  };

  const withThought = (content: ReactNode): ReactNode => <>
    <div className={thoughtOpen ? styles.contentCovered : undefined} inert={Boolean(thoughtOpen)} aria-hidden={thoughtOpen ? true : undefined}>{content}</div>
    {thoughtOpen ? <ThoughtIndex initialThoughtId={thoughtOpen.id} onBack={closeThought} backToBattlefield /> : null}
  </>;

  if (!room || !playerId || !self) {
    return <CoopEntryScreen
      connection={runtime.connection}
      error={runtime.error}
      onCreateRoom={runtime.createRoom}
      onJoinRoom={runtime.joinRoom}
    />;
  }

  if (room.phase === 'lobby') {
    return <CoopLobbyScreen
      room={room}
      playerId={playerId}
      self={self}
      peer={peer}
      error={runtime.error}
      onLeave={leaveRoom}
      onSetReady={(ready) => runtime.sendCommand({ type: 'set-ready', expectedRevision: revision, ready })}
    />;
  }

  if (room.phase === 'draft') {
    return withThought(<CoopDraftScreen
      room={room}
      playerId={playerId}
      onChoose={(choice) => runtime.sendCommand({ type: 'draft-decision', expectedRevision: revision, choice })}
      onOpenThought={openThought}
    />);
  }

  if (room.phase === 'ended') {
    return <CoopResultScreen room={room} onLeave={leaveRoom} />;
  }

  if (!runtime.engine) return null;
  return withThought(<CoopBattleScreen
    room={room}
    playerId={playerId}
    self={self}
    peer={peer}
    viewedPlayer={viewedPlayer}
    engine={runtime.engine}
    backgroundEngine={backgroundEngine}
    availableEngines={runtime.engines}
    error={runtime.error}
    notificationToast={runtime.notificationToast}
    reinforcementNotice={runtime.reinforcementNotice}
    onLeave={leaveRoom}
    onOpenThought={openThought}
    onSetReady={(ready) => runtime.sendCommand({ type: 'set-ready', expectedRevision: revision, ready })}
    onTransferShards={(amount) => runtime.sendCommand({ type: 'transfer-shards', expectedRevision: revision, amount })}
    onViewPlayer={runtime.viewPlayer}
  />);
}
