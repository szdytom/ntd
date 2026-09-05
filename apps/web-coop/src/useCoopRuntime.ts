import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CoopClient } from './client';
import { COOP_PROTOCOL_VERSION } from '@prism-bastion/coop/types';
import type {
  CoopClientMessage,
  CoopPhaseStart,
  CoopPlayerId,
  CoopRoomSnapshot,
  CoopServerMessage,
} from '@prism-bastion/coop/types';
import { peerDefenseToFollow } from '@prism-bastion/coop/viewing';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import { CoopGameController } from '@prism-bastion/coop';
import { createWebVisualFeedback } from '@prism-bastion/web-shared/visual-feedback';
import type { DifficultyId, GameEvent } from '@prism-bastion/game-core/game/types';
import type { ToastState } from '@prism-bastion/web-shared/ui/useGameState';

export type CoopConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface CreateRoomOptions {
  name: string;
  levelId: string;
  difficultyId: DifficultyId;
}

interface JoinRoomOptions {
  name: string;
  code: string;
}

export interface CoopRuntime {
  room: CoopRoomSnapshot | null;
  playerId: CoopPlayerId | null;
  viewedPlayerId: CoopPlayerId | null;
  engine: GameEngine | null;
  engines: Partial<Record<CoopPlayerId, GameEngine>>;
  connection: CoopConnectionStatus;
  error: string | null;
  notificationToast: ToastState | null;
  reinforcementNotice: CoopPhaseStart | null;
  createRoom: (options: CreateRoomOptions) => void;
  joinRoom: (options: JoinRoomOptions) => void;
  leaveRoom: () => void;
  sendCommand: (message: CoopClientMessage) => void;
  viewPlayer: (playerId: CoopPlayerId) => void;
}

export function useCoopRuntime(): CoopRuntime {
  const { t } = useTranslation();
  const clientRef = useRef<CoopClient | null>(null);
  if (!clientRef.current) clientRef.current = new CoopClient();
  const client = clientRef.current;
  const roomRef = useRef<CoopRoomSnapshot | null>(null);
  const playerIdRef = useRef<CoopPlayerId | null>(client.storedSession?.playerId ?? null);
  const enginesRef = useRef<Partial<Record<CoopPlayerId, GameEngine>>>({});
  const engineUnsubscribesRef = useRef<Partial<Record<CoopPlayerId, () => void>>>({});
  const viewedPlayerIdRef = useRef<CoopPlayerId | null>(playerIdRef.current);
  const replayingPlayersRef = useRef(new Set<CoopPlayerId>());
  const lastLocalWavesRef = useRef<Partial<Record<CoopPlayerId, number>>>({});
  const [room, setRoom] = useState<CoopRoomSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<CoopPlayerId | null>(playerIdRef.current);
  const [viewedPlayerId, setViewedPlayerId] = useState<CoopPlayerId | null>(viewedPlayerIdRef.current);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [, setEngineRevision] = useState(0);
  const [connection, setConnection] = useState<CoopConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<ToastState | null>(null);
  const [reinforcementNotice, setReinforcementNotice] = useState<CoopPhaseStart | null>(null);

  const sendCommand = (message: CoopClientMessage): void => {
    if (client.send(message)) return;
    const disconnected = t('coop.error.disconnected');
    setError(disconnected);
    setNotificationToast({ message: disconnected, tone: 'warn', nonce: Date.now() });
  };

  const clearEngines = (): void => {
    for (const unsubscribe of Object.values(engineUnsubscribesRef.current)) unsubscribe?.();
    engineUnsubscribesRef.current = {};
    enginesRef.current = {};
    replayingPlayersRef.current.clear();
    lastLocalWavesRef.current = {};
    setEngine(null);
    setEngineRevision((revision) => revision + 1);
  };

  const viewPlayer = (nextPlayerId: CoopPlayerId): void => {
    const nextEngine = enginesRef.current[nextPlayerId];
    if (!nextEngine) return;
    viewedPlayerIdRef.current = nextPlayerId;
    setViewedPlayerId(nextPlayerId);
    setEngine(nextEngine);
  };

  const installEngine = (nextRoom: CoopRoomSnapshot, planPlayerId: CoopPlayerId, applyPlan = true): GameEngine | null => {
    const player = nextRoom.players.find((candidate) => candidate.id === planPlayerId);
    if (!player) return null;
    let nextEngine = enginesRef.current[planPlayerId];
    if (!nextEngine || nextEngine.level.id !== nextRoom.levelId || nextEngine.difficulty.id !== nextRoom.difficultyId) {
      engineUnsubscribesRef.current[planPlayerId]?.();
      nextEngine = new CoopGameController({ levelId: nextRoom.levelId, difficultyId: nextRoom.difficultyId, seed: 0, visuals: createWebVisualFeedback() }).engine;
      nextEngine.setCommandSink((command) => {
        const currentRoom = roomRef.current;
        if (!currentRoom || planPlayerId !== playerIdRef.current) return;
        sendCommand({
          type: 'plan-command',
          expectedRevision: currentRoom.revision,
          command,
        });
      });
      engineUnsubscribesRef.current[planPlayerId] = nextEngine.subscribe((event: GameEvent) => {
        if (event.type !== 'combat-phase-completed') return;
        const phase = event.result;
        if (replayingPlayersRef.current.has(planPlayerId)) return;
        const currentRoom = roomRef.current;
        const currentPlayerId = playerIdRef.current;
        if (!currentRoom || !currentPlayerId) return;
        if (currentRoom.phase === 'local-defense') lastLocalWavesRef.current[planPlayerId] = currentRoom.wave;
        if (planPlayerId !== currentPlayerId) return;
        sendCommand({
          type: 'combat-result',
          expectedRevision: currentRoom.revision,
          result: {
            phaseId: phase.phaseId,
            planHash: phase.planHash,
            shardsEarned: phase.shardsEarned,
            leaks: phase.leaks,
          },
        });
      });
      enginesRef.current[planPlayerId] = nextEngine;
      setEngineRevision((revision) => revision + 1);
    }
    if (applyPlan) nextEngine.applyGamePlan(player.plan);
    const locallyOwned = planPlayerId === playerIdRef.current;
    nextEngine.setPlanningEnabled(
      locallyOwned && nextRoom.phase === 'planning' && !player.ready && !player.eliminated,
    );
    if (viewedPlayerIdRef.current === planPlayerId) setEngine(nextEngine);
    return nextEngine;
  };

  const startPhase = (message: CoopPhaseStart): void => {
    const currentRoom = roomRef.current;
    const currentPlayerId = playerIdRef.current;
    if (!currentRoom || !currentPlayerId) return;
    const self = currentRoom.players.find((player) => player.id === currentPlayerId);
    if (!self) return;
    const nextEngine = installEngine(currentRoom, message.actorId);
    if (!nextEngine) return;
    if (message.kind === 'reinforcement') {
      replayingPlayersRef.current.add(message.actorId);
      try {
        nextEngine.startCombatPhase({
          phaseId: Math.max(1, message.phaseId - 1),
          planHash: message.planHash,
          wave: message.wave,
          kind: 'local-defense',
        });
        nextEngine.fastForwardCombatPhase();
      } finally {
        replayingPlayersRef.current.delete(message.actorId);
      }
      lastLocalWavesRef.current[message.actorId] = message.wave;
      const actor = currentRoom.players.find((player) => player.id === message.actorId);
      if (actor) nextEngine.synchronizeShards(actor.plan.shards);
    }
    nextEngine.startCombatPhase({
      phaseId: message.phaseId,
      planHash: message.planHash,
      wave: message.wave,
      kind: message.kind,
      signals: message.signals,
    });
    if (message.kind === 'reinforcement') {
      setReinforcementNotice(message);
      viewPlayer(message.actorId);
    } else if (self.eliminated) viewPlayer(message.actorId);
  };

  const receiveRoom = (nextRoom: CoopRoomSnapshot): void => {
    const previousRoom = roomRef.current;
    roomRef.current = nextRoom;
    setRoom(nextRoom);
    setError(null);
    const currentPlayerId = playerIdRef.current;
    const currentPlayer = nextRoom.players.find((player) => player.id === currentPlayerId);
    for (const [ownerId, ownerEngine] of Object.entries(enginesRef.current)) {
      ownerEngine?.setPlanningEnabled(
        ownerId === currentPlayerId
        && nextRoom.phase === 'planning'
        && !currentPlayer?.ready
        && !currentPlayer?.eliminated,
      );
    }
    if (currentPlayerId && ['lobby', 'draft', 'planning', 'ended'].includes(nextRoom.phase)) {
      for (const player of nextRoom.players) installEngine(nextRoom, player.id);
      if (nextRoom.phase === 'draft') viewPlayer(currentPlayerId);
    }
    const peerToFollow = peerDefenseToFollow(previousRoom, nextRoom, currentPlayerId ?? null);
    if (peerToFollow) viewPlayer(peerToFollow);
  };

  useEffect(() => client.subscribe((message: CoopServerMessage) => {
    if (message.type === 'session') {
      playerIdRef.current = message.playerId;
      setPlayerId(message.playerId);
      viewedPlayerIdRef.current = message.playerId;
      setViewedPlayerId(message.playerId);
      roomRef.current = message.room;
      setRoom(message.room);
      for (const player of message.room.players) installEngine(message.room, player.id);
      setError(null);
      return;
    }
    if (message.type === 'room') {
      receiveRoom(message.room);
      return;
    }
    if (message.type === 'phase-start') {
      startPhase(message);
      return;
    }
    if (message.type === 'shards-transferred') {
      const currentPlayerId = playerIdRef.current;
      const currentRoom = roomRef.current;
      if (!currentPlayerId || !currentRoom) return;
      const counterpartId = message.fromId === currentPlayerId ? message.toId : message.fromId;
      const counterpart = currentRoom.players.find((player) => player.id === counterpartId);
      setNotificationToast({
        message: message.fromId === currentPlayerId
          ? t('coop.shardsSent', { amount: message.amount, name: counterpart?.name ?? t('coop.friend') })
          : t('coop.shardsReceived', { amount: message.amount, name: counterpart?.name ?? t('coop.friend') }),
        tone: message.fromId === currentPlayerId ? 'info' : 'good',
        nonce: Date.now(),
      });
      return;
    }
    if (message.type === 'rejected') {
      if (message.room) receiveRoom(message.room);
      setNotificationToast({
        message: t(`coop.error.${message.reason}`, { defaultValue: t('coop.error.commandRejected') }),
        tone: 'warn',
        nonce: Date.now(),
      });
      return;
    }
    setError(t(`coop.ended.${message.reason}`));
    clearEngines();
    playerIdRef.current = null;
    viewedPlayerIdRef.current = null;
    setRoom(null);
    setPlayerId(null);
    setViewedPlayerId(null);
    setNotificationToast(null);
    setReinforcementNotice(null);
    roomRef.current = null;
  }, (status) => setConnection(status)), [client, t]);

  useEffect(() => {
    if (client.storedSession) client.open();
    return () => {
      for (const unsubscribe of Object.values(engineUnsubscribesRef.current)) unsubscribe?.();
    };
  }, [client]);

  useEffect(() => {
    if (!reinforcementNotice) return;
    const timeout = window.setTimeout(() => setReinforcementNotice(null), 2_800);
    return () => window.clearTimeout(timeout);
  }, [reinforcementNotice]);

  useEffect(() => {
    if (!notificationToast) return;
    const timeout = window.setTimeout(() => setNotificationToast(null), 2_700);
    return () => window.clearTimeout(timeout);
  }, [notificationToast]);

  const createRoom = ({ name, levelId, difficultyId }: CreateRoomOptions): void => {
    localStorage.setItem('prism-bastion-coop-name', name.trim());
    client.open({
      type: 'create-room',
      protocolVersion: COOP_PROTOCOL_VERSION,
      name: name.trim(),
      levelId,
      difficultyId,
    });
  };

  const joinRoom = ({ name, code }: JoinRoomOptions): void => {
    localStorage.setItem('prism-bastion-coop-name', name.trim());
    client.open({
      type: 'join-room',
      protocolVersion: COOP_PROTOCOL_VERSION,
      name: name.trim(),
      code: code.trim().toUpperCase(),
    });
  };

  const leaveRoom = (): void => {
    client.close();
    clearEngines();
    roomRef.current = null;
    playerIdRef.current = null;
    viewedPlayerIdRef.current = null;
    setRoom(null);
    setPlayerId(null);
    setViewedPlayerId(null);
    setNotificationToast(null);
    setReinforcementNotice(null);
    setConnection('idle');
    setError(null);
  };

  return {
    room,
    playerId,
    viewedPlayerId,
    engine,
    engines: enginesRef.current,
    connection,
    error,
    notificationToast,
    reinforcementNotice,
    createRoom,
    joinRoom,
    leaveRoom,
    sendCommand,
    viewPlayer,
  };
}
