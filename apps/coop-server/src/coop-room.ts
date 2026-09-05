import { randomBytes, randomUUID } from 'node:crypto';
import type WebSocket from 'ws';
import { ECONOMY_BALANCE } from '@prism-bastion/game-core/game/balance';
import { getLevel, resolveSpawnEntrances } from '@prism-bastion/game-core/game/config';
import { getDifficulty } from '@prism-bastion/game-core/game/difficulty';
import { getSignalCapability, getSignalVariantScales, signalRegistry } from '@prism-bastion/game-core/signals';
import { createCoopDraftRuntime, generateCoopDraftOffers, resolveCoopDraftDecision } from '@prism-bastion/coop/draft';
import { applyCoopPlanningCommand, createInitialCoopPlan, hashCoopPlan } from '@prism-bastion/coop/planning';
import { createCoopPool } from '@prism-bastion/coop/pool';
import type { CoopDraftRuntime } from '@prism-bastion/coop/draft';
import type {
  CoopClientMessage,
  CoopCombatResult,
  CoopDraftOffer,
  CoopLeakedSignal,
  CoopPlayerId,
  CoopPlayerSnapshot,
  CoopRoomSnapshot,
  CoopServerMessage,
} from '@prism-bastion/coop/types';
import { COOP_PLAYER_IDS } from '@prism-bastion/coop/types';
import { coopDevLog, coopDevWarn } from './dev-log';
import type {
  CombatVerificationOutcome,
  CombatVerificationRequest,
  VerifyCombat,
} from '@prism-bastion/coop/simulation';

const RECONNECT_GRACE_MS = 60_000;

interface RoomPlayer {
  id: CoopPlayerId;
  name: string;
  token: string;
  socket: WebSocket | null;
  connected: boolean;
  ready: boolean;
  eliminated: boolean;
  combatSubmitted: boolean;
  combatVerifying: boolean;
  towerSeed: number;
  plan: CoopPlayerSnapshot['plan'];
  draftOffer: CoopDraftOffer | null;
  draftLocked: boolean;
  draftChoice: string | null | undefined;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

type LeakValidation = { ok: true } | {
  ok: false;
  reason: 'invalid-ordinal' | 'unknown-signal' | 'unknown-variant' | 'unknown-entrance' | 'signal-not-in-phase';
  leakIndex: number;
  leak: CoopLeakedSignal;
  available?: number;
};

const token = (): string => randomBytes(24).toString('base64url');
const send = (socket: WebSocket | null, message: CoopServerMessage): void => {
  if (socket?.readyState === 1) socket.send(JSON.stringify(message));
};

export class CoopRoom {
  readonly code: string;
  readonly hostId: CoopPlayerId = 'p1';
  readonly levelId: string;
  readonly difficultyId: CoopRoomSnapshot['difficultyId'];
  readonly roomSeed: number;
  readonly players: Partial<Record<CoopPlayerId, RoomPlayer>> = {};
  readonly pool = createCoopPool();

  revision = 0;
  phase: CoopRoomSnapshot['phase'] = 'lobby';
  phaseId = 0;
  wave = 0;
  result: CoopRoomSnapshot['result'] = null;
  reinforcement: CoopRoomSnapshot['reinforcement'] = null;
  private draftRuntime: CoopDraftRuntime | null = null;
  private readonly draftPlayers = createCoopDraftRuntime(0, 1).players;
  private readonly combatResults: Partial<Record<CoopPlayerId, CoopCombatResult>> = {};
  private closed = false;
  private readonly onClosed: (room: CoopRoom) => void;
  private readonly verifyCombat: VerifyCombat;

  constructor(options: {
    code: string;
    hostName: string;
    hostSocket: WebSocket;
    levelId: string;
    difficultyId: CoopRoomSnapshot['difficultyId'];
    seed: number;
    onClosed: (room: CoopRoom) => void;
    verifyCombat: VerifyCombat;
  }) {
    this.code = options.code;
    this.levelId = options.levelId;
    this.difficultyId = options.difficultyId;
    this.roomSeed = options.seed >>> 0;
    this.onClosed = options.onClosed;
    this.verifyCombat = options.verifyCombat;
    this.players.p1 = this.createPlayer('p1', options.hostName, options.hostSocket);
  }

  private createPlayer(id: CoopPlayerId, name: string, socket: WebSocket): RoomPlayer {
    const towerSeed = (this.roomSeed + (id === 'p1' ? 0x3c6ef372 : 0xa54ff53a)) >>> 0;
    return {
      id,
      name,
      token: token(),
      socket,
      connected: true,
      ready: false,
      eliminated: false,
      combatSubmitted: false,
      combatVerifying: false,
      towerSeed,
      plan: createInitialCoopPlan(this.levelId, this.difficultyId, towerSeed),
      draftOffer: null,
      draftLocked: false,
      draftChoice: undefined,
      reconnectTimer: null,
    };
  }

  join(name: string, socket: WebSocket): RoomPlayer | null {
    if (this.closed || this.phase !== 'lobby' || this.players.p2) return null;
    const player = this.createPlayer('p2', name, socket);
    this.players.p2 = player;
    this.log('player.joined', { playerId: player.id });
    this.bumpAndBroadcast();
    return player;
  }

  resume(resumeToken: string, socket: WebSocket): RoomPlayer | null {
    const player = this.listPlayers().find((candidate) => candidate.token === resumeToken);
    if (!player || this.closed) return null;
    if (player.reconnectTimer) clearTimeout(player.reconnectTimer);
    player.reconnectTimer = null;
    player.socket?.close(4001, 'Session resumed elsewhere');
    player.socket = socket;
    player.connected = true;
    this.log('player.resumed', { playerId: player.id });
    this.bumpAndBroadcast();
    this.sendSession(player);
    this.resendActivePhase(player);
    return player;
  }

  sendSession(player: RoomPlayer): void {
    send(player.socket, { type: 'session', playerId: player.id, token: player.token, room: this.snapshot() });
  }

  disconnect(playerId: CoopPlayerId, socket: WebSocket): void {
    const player = this.players[playerId];
    if (!player || this.closed) return;
    if (player.socket !== socket) {
      this.warn('connection.stale-disconnect-ignored', { playerId });
      return;
    }
    player.socket = null;
    player.connected = false;
    this.warn('player.disconnected', { playerId, reconnectGraceMs: RECONNECT_GRACE_MS });
    this.bumpAndBroadcast();
    player.reconnectTimer = setTimeout(() => {
      if (player.connected || this.closed) return;
      this.warn('player.reconnect-expired', { playerId });
      this.endRoom('disconnected');
    }, RECONNECT_GRACE_MS);
  }

  leave(playerId: CoopPlayerId, socket: WebSocket): void {
    const player = this.players[playerId];
    if (!player || player.socket !== socket || this.closed) return;
    this.log('player.left', { playerId });
    this.endRoom('closed');
  }

  handle(
    playerId: CoopPlayerId,
    message: Exclude<CoopClientMessage, { type: 'create-room' | 'join-room' | 'resume-room' }>,
    socket: WebSocket,
  ): void {
    const player = this.players[playerId];
    if (!player || this.closed) return;
    if (player.socket !== socket) {
      this.warn('message.stale-connection-ignored', { playerId, messageType: message.type });
      return;
    }
    if (message.type === 'leave-room') {
      this.endRoom('closed');
      return;
    }
    const traceId = randomUUID();
    this.log('message.received', {
      playerId,
      messageType: message.type,
      traceId,
      expectedRevision: message.expectedRevision,
    });
    if (message.expectedRevision > this.revision) {
      this.reject(player, traceId, 'future-revision');
      return;
    }
    if (message.type === 'plan-command') this.handlePlanCommand(player, message, traceId);
    else if (message.type === 'transfer-shards') this.handleTransfer(player, message, traceId);
    else if (message.type === 'set-ready') this.handleReady(player, message, traceId);
    else if (message.type === 'draft-decision') this.handleDraft(player, message, traceId);
    else this.handleCombatResult(player, message.result, traceId);
  }

  snapshot(): CoopRoomSnapshot {
    return {
      code: this.code,
      revision: this.revision,
      phase: this.phase,
      phaseId: this.phaseId,
      hostId: this.hostId,
      levelId: this.levelId,
      difficultyId: this.difficultyId,
      wave: this.wave,
      maxWaves: getLevel(this.levelId).waves.length,
      players: this.listPlayers().map((player) => ({
        id: player.id,
        name: player.name,
        connected: player.connected,
        ready: player.ready,
        eliminated: player.eliminated,
        combatSubmitted: player.combatSubmitted,
        plan: structuredClone(player.plan),
        draftOffer: player.draftOffer ? structuredClone(player.draftOffer) : null,
        draftLocked: player.draftLocked,
        draftChoice: player.draftChoice,
      })),
      pool: { ...this.pool },
      reinforcement: this.reinforcement ? structuredClone(this.reinforcement) : null,
      result: this.result,
    };
  }

  private handlePlanCommand(player: RoomPlayer, message: Extract<CoopClientMessage, { type: 'plan-command' }>, traceId: string): void {
    if (!this.canPlan(player)) return this.reject(player, traceId, 'planning-locked');
    const result = applyCoopPlanningCommand(player.plan, message.command, this.levelId, player.towerSeed);
    if (!result.ok) return this.reject(player, traceId, result.reason);
    player.plan = result.plan;
    this.bumpAndBroadcast();
  }

  private handleTransfer(player: RoomPlayer, message: Extract<CoopClientMessage, { type: 'transfer-shards' }>, traceId: string): void {
    if (!this.canPlan(player)) return this.reject(player, traceId, 'planning-locked');
    const peer = this.peerOf(player.id);
    if (!peer || peer.eliminated || peer.ready) return this.reject(player, traceId, 'recipient-unavailable');
    if (player.plan.shards < message.amount) return this.reject(player, traceId, 'insufficient-shards');
    player.plan.shards -= message.amount;
    peer.plan.shards += message.amount;
    this.bumpAndBroadcast();
    const notification: CoopServerMessage = {
      type: 'shards-transferred',
      fromId: player.id,
      toId: peer.id,
      amount: message.amount,
    };
    for (const participant of this.listPlayers()) send(participant.socket, notification);
    this.log('shards.transferred', { fromId: player.id, toId: peer.id, amount: message.amount });
  }

  private handleReady(player: RoomPlayer, message: Extract<CoopClientMessage, { type: 'set-ready' }>, traceId: string): void {
    if ((this.phase !== 'lobby' && this.phase !== 'planning') || player.eliminated) {
      return this.reject(player, traceId, 'ready-unavailable');
    }
    player.ready = message.ready;
    this.bumpAndBroadcast();
    const active = this.activePlayers();
    if (this.players.p2 && active.length > 0 && active.every((candidate) => candidate.ready && candidate.connected)) {
      if (this.phase === 'lobby') this.beginDraft(getLevel(this.levelId).moduleDraft.initialPicks);
      else this.beginLocalDefense();
    }
  }

  private handleDraft(player: RoomPlayer, message: Extract<CoopClientMessage, { type: 'draft-decision' }>, traceId: string): void {
    if (this.phase !== 'draft' || player.eliminated || player.draftLocked || !player.draftOffer || !this.draftRuntime) {
      return this.reject(player, traceId, 'draft-unavailable');
    }
    if (message.choice !== null && !player.draftOffer.choices.includes(message.choice)) {
      return this.reject(player, traceId, 'choice-unavailable');
    }
    if (message.choice === null && !player.draftOffer.canAbandon) {
      return this.reject(player, traceId, 'abandon-unavailable');
    }
    player.draftChoice = message.choice;
    player.draftLocked = true;
    this.log('draft.choice-locked', {
      playerId: player.id,
      traceId,
      pick: this.draftRuntime.pick,
      choice: message.choice,
    });
    this.bumpAndBroadcast();
    const active = this.activePlayers();
    if (!active.every((candidate) => candidate.draftLocked)) return;

    for (const candidate of active) {
      const offer = candidate.draftOffer;
      if (!offer) continue;
      const result = resolveCoopDraftDecision(
        this.draftRuntime,
        candidate.id,
        offer,
        candidate.draftChoice ?? null,
        candidate.plan,
        this.pool,
      );
      if (!result.ok) {
        this.warn('desync.draft-resolution', {
          playerId: candidate.id,
          traceId,
          reason: result.reason,
          pick: this.draftRuntime.pick,
          choice: candidate.draftChoice ?? null,
          offeredChoices: offer.choices,
          available: candidate.draftChoice ? this.pool[candidate.draftChoice] ?? 0 : null,
        });
        this.endRoom('desync');
        return;
      }
    }
    if (this.draftRuntime.pick >= this.draftRuntime.totalPicks) {
      this.phase = 'planning';
      this.draftRuntime = null;
      for (const candidate of active) {
        candidate.draftOffer = null;
        candidate.draftChoice = undefined;
        candidate.draftLocked = false;
        candidate.ready = false;
      }
      this.log('phase.planning-started');
      this.bumpAndBroadcast();
      return;
    }
    this.draftRuntime.pick += 1;
    this.assignDraftOffers();
  }

  private handleCombatResult(player: RoomPlayer, result: CoopCombatResult, traceId: string): void {
    if (
      player.eliminated || result.phaseId !== this.phaseId
      || (this.phase !== 'local-defense' && this.phase !== 'reinforcement')
    ) return this.reject(player, traceId, 'combat-result-unavailable');
    if (player.combatSubmitted) {
      this.warn('combat.duplicate-result-ignored', {
        playerId: player.id,
        traceId,
        resultPhaseId: result.phaseId,
        resultPlanHash: result.planHash,
      });
      return;
    }
    if (player.combatVerifying) {
      this.warn('combat.duplicate-result-pending', {
        playerId: player.id,
        traceId,
        resultPhaseId: result.phaseId,
        resultPlanHash: result.planHash,
      });
      return;
    }
    const expectedActor = this.phase === 'reinforcement' ? this.reinforcement?.defenderId : player.id;
    const expectedPlanHash = hashCoopPlan(player.plan);
    if (expectedActor !== player.id) return this.reject(player, traceId, 'combat-result-unavailable');
    if (result.planHash !== expectedPlanHash) {
      this.warn('combat.claim-plan-mismatch', {
        playerId: player.id,
        traceId,
        resultPhaseId: result.phaseId,
        expectedPlanHash,
        resultPlanHash: result.planHash,
      });
    }
    const leakValidation = this.validateLeaks(result.leaks);
    if (!leakValidation.ok) {
      this.warn('combat.claim-invalid-leaks', {
        playerId: player.id,
        traceId,
        validationReason: leakValidation.reason,
        leakIndex: leakValidation.leakIndex,
        leak: leakValidation.leak,
        available: leakValidation.available ?? null,
        leakCount: result.leaks.length,
        leaks: result.leaks.slice(0, 12),
        leaksTruncated: result.leaks.length > 12,
      });
    }
    const verification: CombatVerificationRequest = {
      levelId: this.levelId,
      difficultyId: this.difficultyId,
      phaseId: this.phaseId,
      kind: this.phase,
      wave: this.wave,
      planHash: expectedPlanHash,
      plan: structuredClone(player.plan),
      signals: this.phase === 'reinforcement' && this.reinforcement
        ? structuredClone(this.reinforcement.signals)
        : [],
    };
    player.combatVerifying = true;
    this.log('combat.verification-started', { playerId: player.id, traceId });
    try {
      this.verifyCombat(verification, result, (outcome) => {
        this.finishCombatVerification(player, result, traceId, verification.phaseId, outcome);
      });
    } catch (error) {
      this.finishCombatVerification(player, result, traceId, verification.phaseId, {
        ok: false,
        reason: 'verification-error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private finishCombatVerification(
    player: RoomPlayer,
    result: CoopCombatResult,
    traceId: string,
    phaseId: number,
    outcome: CombatVerificationOutcome,
  ): void {
    if (this.closed || !player.combatVerifying) return;
    player.combatVerifying = false;
    if (this.phaseId !== phaseId || player.combatSubmitted) return;
    let acceptedResult = result;
    if (!outcome.ok) {
      if (outcome.reason === 'result-mismatch') {
        acceptedResult = outcome.expected;
        this.warn('combat.result-reconciled', {
          playerId: player.id,
          traceId,
          claimedShards: result.shardsEarned,
          claimedLeakCount: result.leaks.length,
          authoritativeShards: outcome.expected.shardsEarned,
          authoritativeLeakCount: outcome.expected.leaks.length,
        });
      } else {
        this.warn('combat.verification-failed', {
          playerId: player.id,
          traceId,
          reason: outcome.reason,
          claimedShards: result.shardsEarned,
          claimedLeakCount: result.leaks.length,
          error: outcome.error,
        });
        this.endRoom('desync');
        return;
      }
    }
    this.log('combat.result-accepted', {
      playerId: player.id,
      traceId,
      planHash: acceptedResult.planHash,
      shardsEarned: acceptedResult.shardsEarned,
      leakCount: acceptedResult.leaks.length,
      reconciled: acceptedResult !== result,
    });
    player.plan.shards += acceptedResult.shardsEarned;
    this.combatResults[player.id] = structuredClone(acceptedResult);
    player.combatSubmitted = true;
    this.bumpAndBroadcast();
    if (this.phase === 'reinforcement') {
      const owner = this.reinforcement ? this.players[this.reinforcement.ownerId] : null;
      if (owner) this.applyLeaks(owner, acceptedResult.leaks);
      this.finishWave();
      return;
    }
    const active = this.activePlayers();
    if (!active.every((candidate) => this.combatResults[candidate.id])) return;
    if (active.length === 2) {
      const first = active[0]!;
      const second = active[1]!;
      const firstLeaks = this.combatResults[first.id]?.leaks ?? [];
      const secondLeaks = this.combatResults[second.id]?.leaks ?? [];
      if (firstLeaks.length > 0 && secondLeaks.length === 0) return this.beginReinforcement(second, first, firstLeaks);
      if (secondLeaks.length > 0 && firstLeaks.length === 0) return this.beginReinforcement(first, second, secondLeaks);
      if (firstLeaks.length > 0 && secondLeaks.length > 0) {
        this.applyLeaks(first, firstLeaks);
        this.applyLeaks(second, secondLeaks);
      }
    } else {
      const only = active[0];
      if (only) this.applyLeaks(only, this.combatResults[only.id]?.leaks ?? []);
    }
    this.finishWave();
  }

  private beginDraft(totalPicks: number): void {
    this.phase = 'draft';
    this.draftRuntime = createCoopDraftRuntime((this.roomSeed ^ Math.imul(this.wave + 1, 0x9e3779b9)) >>> 0, totalPicks);
    this.draftRuntime.players = this.draftPlayers;
    for (const state of Object.values(this.draftPlayers)) state.previousChoices.clear();
    for (const player of this.listPlayers()) player.ready = false;
    this.log('phase.draft-started', { totalPicks });
    this.assignDraftOffers();
  }

  private assignDraftOffers(): void {
    if (!this.draftRuntime) return;
    const active = this.activePlayers();
    const plans = {
      p1: this.players.p1?.plan ?? active[0]!.plan,
      p2: this.players.p2?.plan ?? active[0]!.plan,
    };
    const offers = generateCoopDraftOffers(
      this.draftRuntime,
      active.map((player) => player.id),
      plans,
      this.pool,
      this.levelId,
      this.wave,
    );
    for (const player of active) {
      player.draftOffer = offers[player.id] ?? null;
      player.draftLocked = false;
      player.draftChoice = undefined;
    }
    this.log('draft.offers-assigned', {
      pick: this.draftRuntime.pick,
      totalPicks: this.draftRuntime.totalPicks,
      offers: Object.fromEntries(active.map((player) => [player.id, player.draftOffer?.choices ?? []])),
    });
    this.bumpAndBroadcast();
  }

  private beginLocalDefense(): void {
    this.phase = 'local-defense';
    this.phaseId += 1;
    this.wave += 1;
    this.reinforcement = null;
    for (const id of COOP_PLAYER_IDS) delete this.combatResults[id];
    for (const player of this.listPlayers()) {
      player.ready = false;
      player.combatSubmitted = false;
      player.combatVerifying = false;
    }
    this.log('phase.local-defense-started', { actors: this.activePlayers().map((player) => player.id) });
    this.bumpAndBroadcast();
    for (const player of this.activePlayers()) {
      this.sendPhaseStart(player.id, 'local-defense', []);
    }
  }

  private beginReinforcement(defender: RoomPlayer, owner: RoomPlayer, signals: CoopLeakedSignal[]): void {
    this.phase = 'reinforcement';
    this.phaseId += 1;
    this.reinforcement = { defenderId: defender.id, ownerId: owner.id, signals: structuredClone(signals) };
    defender.combatSubmitted = false;
    defender.combatVerifying = false;
    delete this.combatResults[defender.id];
    this.log('phase.reinforcement-started', {
      defenderId: defender.id,
      ownerId: owner.id,
      signalCount: signals.length,
      signals: signals.slice(0, 12),
      signalsTruncated: signals.length > 12,
    });
    this.bumpAndBroadcast();
    this.sendPhaseStart(defender.id, 'reinforcement', signals);
  }

  private finishWave(): void {
    for (const player of this.activePlayers()) {
      if (player.plan.core <= 0) {
        player.plan.core = 0;
        player.eliminated = true;
        player.ready = false;
      }
    }
    const active = this.activePlayers();
    if (active.length === 0) {
      this.phase = 'ended';
      this.result = 'defeat';
      this.log('phase.ended', { result: this.result });
      this.bumpAndBroadcast();
      return;
    }
    if (this.wave >= getLevel(this.levelId).waves.length) {
      this.phase = 'ended';
      this.result = 'victory';
      this.log('phase.ended', { result: this.result });
      this.bumpAndBroadcast();
      return;
    }
    const difficulty = getDifficulty(this.difficultyId);
    const bonus = Math.round((ECONOMY_BALANCE.waveBonusBase + this.wave * ECONOMY_BALANCE.waveBonusPerWave) * difficulty.economy);
    for (const player of active) {
      player.plan.shards += bonus;
      player.combatSubmitted = false;
    }
    this.log('wave.completed', { bonus, activePlayers: active.map((player) => player.id) });
    this.reinforcement = null;
    this.beginDraft(getLevel(this.levelId).moduleDraft.wavePicks);
  }

  private applyLeaks(owner: RoomPlayer, leaks: readonly CoopLeakedSignal[]): void {
    const damage = leaks.reduce((sum, leak) => {
      const definition = signalRegistry.require(leak.type);
      const scales = getSignalVariantScales(definition, leak.variantId);
      return sum + Math.max(1, Math.round(definition.stats.coreDamage * (scales?.coreDamage ?? 1)));
    }, 0);
    const coreBefore = owner.plan.core;
    owner.plan.core = Math.max(0, owner.plan.core - damage);
    this.log('combat.leaks-applied', {
      ownerId: owner.id,
      leakCount: leaks.length,
      damage,
      coreBefore,
      coreAfter: owner.plan.core,
    });
  }

  private validateLeaks(leaks: readonly CoopLeakedSignal[]): LeakValidation {
    const level = getLevel(this.levelId);
    const signalIds = signalRegistry.ids();
    const variantIds = signalRegistry.variants();
    for (const [index, leak] of leaks.entries()) {
      if (leak.ordinal !== index) return { ok: false, reason: 'invalid-ordinal', leakIndex: index, leak };
      if (!signalIds.includes(leak.type)) return { ok: false, reason: 'unknown-signal', leakIndex: index, leak };
      if (
        !variantIds.includes(leak.variantId)
        || signalRegistry.signalIdForVariant(leak.variantId) !== leak.type
        || !getSignalVariantScales(signalRegistry.require(leak.type), leak.variantId)
      ) return { ok: false, reason: 'unknown-variant', leakIndex: index, leak };
      if (!level.graph.entrances.includes(leak.entrance)) {
        return { ok: false, reason: 'unknown-entrance', leakIndex: index, leak };
      }
    }
    const possible = new Map<string, number>();
    const source = this.phase === 'reinforcement'
      ? this.reinforcement?.signals ?? []
      : level.waves[this.wave - 1]?.flatMap((entry) => (
        resolveSpawnEntrances(entry, level.graph).map((entrance, ordinal) => ({
          ordinal,
          type: entry.type,
          variantId: entry.type,
          entrance,
        }))
      )) ?? [];
    for (const signal of source) {
      const key = `${signal.type}\u0000${signal.variantId}\u0000${signal.entrance}`;
      possible.set(key, (possible.get(key) ?? 0) + 1);
    }
    for (const [index, leak] of leaks.entries()) {
      const key = `${leak.type}\u0000${leak.variantId}\u0000${leak.entrance}`;
      const remaining = possible.get(key) ?? 0;
      if (remaining > 0) {
        possible.set(key, remaining - 1);
        continue;
      }
      const split = getSignalCapability(signalRegistry.require(leak.type), 'split-on-death');
      const baseKey = `${leak.type}\u0000${leak.type}\u0000${leak.entrance}`;
      const parentRemaining = possible.get(baseKey) ?? 0;
      if (split?.childVariantId === leak.variantId && parentRemaining > 0) {
        possible.set(baseKey, parentRemaining - 1);
        possible.set(key, split.count - 1);
        continue;
      }
      return { ok: false, reason: 'signal-not-in-phase', leakIndex: index, leak, available: remaining };
    }
    return { ok: true };
  }

  private sendPhaseStart(actorId: CoopPlayerId, kind: 'local-defense' | 'reinforcement', signals: CoopLeakedSignal[]): void {
    const actor = this.players[actorId];
    if (!actor) return;
    const message: CoopServerMessage = {
      type: 'phase-start',
      phaseId: this.phaseId,
      kind,
      wave: this.wave,
      actorId,
      planHash: hashCoopPlan(actor.plan),
      signals: structuredClone(signals),
    };
    this.log('combat.phase-sent', {
      actorId,
      kind,
      planHash: message.planHash,
      signalCount: signals.length,
    });
    for (const player of this.listPlayers()) send(player.socket, message);
  }

  private resendActivePhase(player: RoomPlayer): void {
    if (this.phase === 'local-defense' && !player.eliminated && !player.combatSubmitted) {
      this.sendPhaseStart(player.id, 'local-defense', []);
    } else if (this.phase === 'reinforcement' && this.reinforcement?.defenderId === player.id && !player.combatSubmitted) {
      this.sendPhaseStart(player.id, 'reinforcement', this.reinforcement.signals);
    }
  }

  private canPlan(player: RoomPlayer): boolean {
    return this.phase === 'planning' && !player.eliminated && !player.ready;
  }

  private activePlayers(): RoomPlayer[] {
    return this.listPlayers().filter((player) => !player.eliminated);
  }

  private listPlayers(): RoomPlayer[] {
    return COOP_PLAYER_IDS.flatMap((id) => this.players[id] ? [this.players[id]!] : []);
  }

  private peerOf(id: CoopPlayerId): RoomPlayer | null {
    return this.players[id === 'p1' ? 'p2' : 'p1'] ?? null;
  }

  private reject(player: RoomPlayer, traceId: string, reason: string): void {
    this.warn('message.rejected', { playerId: player.id, traceId, reason });
    send(player.socket, { type: 'rejected', traceId, reason, room: this.snapshot() });
  }

  private bumpAndBroadcast(): void {
    this.revision += 1;
    this.log('room.broadcast', {
      players: this.listPlayers().map((player) => ({
        id: player.id,
        connected: player.connected,
        ready: player.ready,
        eliminated: player.eliminated,
        combatSubmitted: player.combatSubmitted,
      })),
    });
    const message: CoopServerMessage = { type: 'room', room: this.snapshot() };
    for (const player of this.listPlayers()) send(player.socket, message);
  }

  private endRoom(reason: 'disconnected' | 'desync' | 'closed'): void {
    if (this.closed) return;
    const log = reason === 'desync' ? this.warn.bind(this) : this.log.bind(this);
    log('room.ended', { reason });
    this.closed = true;
    this.phase = 'ended';
    this.result = reason === 'disconnected' ? 'disconnected' : reason === 'desync' ? 'desync' : this.result;
    for (const player of this.listPlayers()) {
      if (player.reconnectTimer) clearTimeout(player.reconnectTimer);
      send(player.socket, { type: 'room-ended', reason });
    }
    this.onClosed(this);
  }

  private log(event: string, details: Readonly<Record<string, unknown>> = {}): void {
    coopDevLog(event, {
      room: this.code,
      phase: this.phase,
      phaseId: this.phaseId,
      wave: this.wave,
      revision: this.revision,
      ...details,
    });
  }

  private warn(event: string, details: Readonly<Record<string, unknown>> = {}): void {
    coopDevWarn(event, {
      room: this.code,
      phase: this.phase,
      phaseId: this.phaseId,
      wave: this.wave,
      revision: this.revision,
      ...details,
    });
  }
}
