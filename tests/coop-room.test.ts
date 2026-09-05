import { afterEach, describe, expect, it, vi } from 'vitest';
import type WebSocket from 'ws';
import { CoopRoom } from '../apps/coop-server/src/coop-room';
import { hashCoopPlan } from '@prism-bastion/coop/planning';
import type { CoopLeakedSignal, CoopPlayerId, CoopServerMessage } from '@prism-bastion/coop/types';
import { peerDefenseToFollow } from '@prism-bastion/coop/viewing';
import type { VerifyCombat } from '@prism-bastion/coop/simulation';

class FakeSocket {
  readyState = 1;
  sent: CoopServerMessage[] = [];
  send(payload: string): void {
    this.sent.push(JSON.parse(payload) as CoopServerMessage);
  }
  close(): void {
    this.readyState = 3;
  }
}

const asSocket = (socket: FakeSocket): WebSocket => socket as unknown as WebSocket;

const approveCombat: VerifyCombat = (_request, _claimed, complete) => complete({ ok: true });

const createRoom = (verifyCombat: VerifyCombat = approveCombat) => {
  const first = new FakeSocket();
  const second = new FakeSocket();
  const closed = vi.fn();
  const room = new CoopRoom({
    code: 'ABC234',
    hostName: 'Alpha',
    hostSocket: asSocket(first),
    levelId: 'white-prism',
    difficultyId: 'normal',
    seed: 42,
    onClosed: closed,
    verifyCombat,
  });
  room.join('Beta', asSocket(second));
  return { room, first, second, closed };
};

const handle = (room: CoopRoom, playerId: CoopPlayerId, message: Parameters<CoopRoom['handle']>[1]): void => {
  const socket = room.players[playerId]?.socket;
  if (socket) room.handle(playerId, message, socket);
};

const ready = (room: CoopRoom, playerId: CoopPlayerId): void => handle(room, playerId, {
  type: 'set-ready', expectedRevision: room.revision, ready: true,
});

const finishDraft = (room: CoopRoom): void => {
  while (room.phase === 'draft') {
    for (const playerId of ['p1', 'p2'] as const) {
      const player = room.snapshot().players.find((candidate) => candidate.id === playerId);
      if (!player || player.eliminated || player.draftLocked || !player.draftOffer) continue;
      handle(room, playerId, {
        type: 'draft-decision',
        expectedRevision: room.revision,
        choice: player.draftOffer.choices[0] ?? null,
      });
    }
  }
};

const beginFirstWave = (room: CoopRoom): void => {
  ready(room, 'p1');
  ready(room, 'p2');
  finishDraft(room);
  ready(room, 'p1');
  ready(room, 'p2');
  expect(room.phase).toBe('local-defense');
};

const combatResult = (
  room: CoopRoom,
  playerId: CoopPlayerId,
  leaks: CoopLeakedSignal[],
  shardsEarned = 0,
) => ({
  type: 'combat-result' as const,
  expectedRevision: room.revision,
  result: {
    phaseId: room.phaseId,
    planHash: hashCoopPlan(room.players[playerId]!.plan),
    shardsEarned,
    leaks,
  },
});

describe('co-op room state machine', () => {
  afterEach(() => vi.useRealTimers());

  it('waits at each draft pick and routes one-sided leaks through reinforcement', () => {
    const { room } = createRoom();
    beginFirstWave(room);
    const defenderShards = room.players.p2!.plan.shards;
    handle(room, 'p1', combatResult(room, 'p1', [{ ordinal: 0, type: 'spark', variantId: 'spark', entrance: 'white-prism:0' }]));
    expect(room.phase).toBe('local-defense');
    handle(room, 'p2', combatResult(room, 'p2', [], 7));
    expect(room.phase).toBe('reinforcement');
    expect(room.reinforcement?.defenderId).toBe('p2');
    handle(room, 'p2', combatResult(room, 'p2', []));
    expect(room.phase).toBe('draft');
    expect(room.wave).toBe(1);
    expect(room.players.p1?.plan.core).toBe(20);
    expect(room.players.p2?.plan.shards).toBe(defenderShards + 7 + 38);
  });

  it('follows the unfinished peer after the local result is first accepted', () => {
    const { room } = createRoom();
    beginFirstWave(room);
    const before = room.snapshot();

    handle(room, 'p1', combatResult(room, 'p1', []));
    const after = room.snapshot();

    expect(peerDefenseToFollow(before, after, 'p1')).toBe('p2');
    expect(peerDefenseToFollow(after, after, 'p1')).toBeNull();
    expect(peerDefenseToFollow(before, after, 'p2')).toBeNull();
  });

  it('transfers shards atomically only while both players are editable', () => {
    const { room, first } = createRoom();
    ready(room, 'p1');
    ready(room, 'p2');
    finishDraft(room);
    const firstBefore = room.players.p1!.plan.shards;
    const secondBefore = room.players.p2!.plan.shards;
    handle(room, 'p1', {
      type: 'transfer-shards', expectedRevision: room.revision, amount: 25,
    });
    expect(room.players.p1!.plan.shards).toBe(firstBefore - 25);
    expect(room.players.p2!.plan.shards).toBe(secondBefore + 25);
    expect(first.sent.at(-1)).toEqual({ type: 'shards-transferred', fromId: 'p1', toId: 'p2', amount: 25 });
    ready(room, 'p1');
    handle(room, 'p1', {
      type: 'transfer-shards', expectedRevision: room.revision, amount: 10,
    });
    expect(room.players.p1!.plan.shards).toBe(firstBefore - 25);
    expect(first.sent.at(-1)).toMatchObject({
      type: 'rejected',
      traceId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
      reason: 'planning-locked',
    });
  });

  it('eliminates a core while freezing its resources and lets the survivor continue', () => {
    const { room } = createRoom();
    beginFirstWave(room);
    room.players.p1!.plan.core = 5;
    handle(room, 'p1', {
      ...combatResult(room, 'p1', []),
      result: {
        phaseId: room.phaseId,
        planHash: hashCoopPlan(room.players.p1!.plan),
        shardsEarned: 0,
        leaks: [{ ordinal: 0, type: 'crown', variantId: 'crown', entrance: 'white-prism:0' }],
      },
    });
    handle(room, 'p2', combatResult(room, 'p2', [{ ordinal: 0, type: 'spark', variantId: 'spark', entrance: 'white-prism:0' }]));
    expect(room.players.p1?.eliminated).toBe(true);
    expect(room.players.p1?.plan.core).toBe(0);
    expect(room.players.p2?.eliminated).toBe(false);
    expect(room.phase).toBe('draft');
  });

  it('ignores duplicate combat results without changing the accepted outcome', () => {
    const { room, first, second } = createRoom();
    beginFirstWave(room);
    const result = combatResult(room, 'p1', [], 7);
    handle(room, 'p1', result);
    const shardsAfterFirstResult = room.players.p1!.plan.shards;

    handle(room, 'p1', result);

    expect(room.phase).toBe('local-defense');
    expect(room.players.p1?.plan.shards).toBe(shardsAfterFirstResult);
    expect(first.sent.at(-1)?.type).toBe('room');
    expect(second.sent.at(-1)?.type).toBe('room');
  });

  it('reconciles a mismatched combat result to the authoritative outcome', () => {
    const verifyCombat: VerifyCombat = (request, _claimed, complete) => complete({
      ok: false,
      reason: 'result-mismatch',
      expected: {
        phaseId: request.phaseId,
        planHash: request.planHash,
        shardsEarned: 0,
        leaks: [],
      },
    });
    const { room, closed } = createRoom(verifyCombat);
    beginFirstWave(room);
    const shardsBefore = room.players.p1!.plan.shards;

    const claimed = combatResult(room, 'p1', [], 1_000_000);
    claimed.result.planHash = 'deadbeef';
    handle(room, 'p1', claimed);

    expect(closed).not.toHaveBeenCalled();
    expect(room.result).toBeNull();
    expect(room.players.p1?.plan.shards).toBe(shardsBefore);
    expect(room.players.p1?.combatSubmitted).toBe(true);
  });

  it('routes fracture fragments without rejecting or restoring them as full cores', () => {
    const { room, closed } = createRoom();
    beginFirstWave(room);
    room.wave = 5;
    const fragments: CoopLeakedSignal[] = Array.from({ length: 3 }, (_, ordinal) => ({
      ordinal,
      type: 'fracture',
      variantId: 'fracture-fragment',
      entrance: 'white-prism:0',
    }));

    handle(room, 'p1', combatResult(room, 'p1', fragments));
    handle(room, 'p2', combatResult(room, 'p2', []));

    expect(room.phase).toBe('reinforcement');
    expect(room.reinforcement?.signals).toEqual(fragments);
    handle(room, 'p2', combatResult(room, 'p2', fragments));

    expect(closed).not.toHaveBeenCalled();
    expect(room.players.p1?.plan.core).toBe(14);
    expect(room.result).toBe('victory');
  });

  it('applies the authoritative reinforcement result after reconciliation', () => {
    const verifyCombat: VerifyCombat = (request, _claimed, complete) => {
      if (request.kind === 'local-defense') return complete({ ok: true });
      complete({
        ok: false,
        reason: 'result-mismatch',
        expected: {
          phaseId: request.phaseId,
          planHash: request.planHash,
          shardsEarned: 0,
          leaks: [{
            ordinal: 0,
            type: 'fracture',
            variantId: 'fracture-fragment',
            entrance: 'white-prism:0',
          }],
        },
      });
    };
    const { room, closed } = createRoom(verifyCombat);
    beginFirstWave(room);
    room.wave = 5;
    const fragment: CoopLeakedSignal = {
      ordinal: 0,
      type: 'fracture',
      variantId: 'fracture-fragment',
      entrance: 'white-prism:0',
    };

    handle(room, 'p1', combatResult(room, 'p1', [fragment]));
    handle(room, 'p2', combatResult(room, 'p2', []));
    handle(room, 'p2', combatResult(room, 'p2', []));

    expect(closed).not.toHaveBeenCalled();
    expect(room.players.p1?.plan.core).toBe(18);
    expect(room.result).toBe('victory');
  });

  it('submits only one authority check while a result is pending', () => {
    let finish: Parameters<VerifyCombat>[2] | null = null;
    const verifyCombat = vi.fn<VerifyCombat>((_request, _claimed, complete) => { finish = complete; });
    const { room } = createRoom(verifyCombat);
    beginFirstWave(room);
    const result = combatResult(room, 'p1', []);

    handle(room, 'p1', result);
    handle(room, 'p1', result);

    expect(verifyCombat).toHaveBeenCalledOnce();
    expect(room.players.p1?.combatSubmitted).toBe(false);
    expect(finish).not.toBeNull();
    (finish as unknown as (outcome: { ok: true }) => void)({ ok: true });
    expect(room.players.p1?.combatSubmitted).toBe(true);
  });

  it('ignores messages from a connection replaced by session recovery', () => {
    const { room, first } = createRoom();
    const replacement = new FakeSocket();
    const player = room.players.p1!;
    expect(room.resume(player.token, asSocket(replacement))).toBe(player);
    const revisionAfterResume = room.revision;

    room.handle('p1', {
      type: 'set-ready', expectedRevision: room.revision, ready: true,
    }, asSocket(first));

    expect(room.revision).toBe(revisionAfterResume);
    expect(room.players.p1?.ready).toBe(false);
  });

  it('ends the whole room after the reconnect grace expires', () => {
    vi.useFakeTimers();
    const { room, first, second, closed } = createRoom();
    room.disconnect('p1', asSocket(first));
    vi.advanceTimersByTime(60_000);
    expect(closed).toHaveBeenCalledOnce();
    expect(second.sent.at(-1)).toEqual({ type: 'room-ended', reason: 'disconnected' });
  });

  it('ends the room immediately when a player leaves intentionally', () => {
    const { room, first, second, closed } = createRoom();
    room.leave('p1', asSocket(first));
    expect(closed).toHaveBeenCalledOnce();
    expect(second.sent.at(-1)).toEqual({ type: 'room-ended', reason: 'closed' });
  });
});
