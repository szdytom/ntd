import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { LEVELS, TUTORIAL_LEVEL_ID } from '@prism-bastion/game-core/game/config';
import { COOP_PROTOCOL_VERSION } from '@prism-bastion/coop/types';
import type { CoopPlayerId, CoopServerMessage } from '@prism-bastion/coop/types';
import { parseCoopClientMessage } from '@prism-bastion/coop/protocol';
import { CoopRoom } from './coop-room';
import { CombatVerifierPool } from './combat-verifier';
import { readCoopServerConfig } from './config';
import { coopDevError, coopDevLog, coopDevWarn } from './dev-log';
import { createWebSocketOriginPolicy } from './origin-policy';

const {
  host,
  port,
  combatWorkerCount,
  combatQueueLimit,
  maxRooms,
  maxConnections,
} = readCoopServerConfig();
const combatVerifier = new CombatVerifierPool(combatWorkerCount, combatQueueLimit);
const rooms = new Map<string, CoopRoom>();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const originPolicy = createWebSocketOriginPolicy({
  allowedOrigins: process.env.COOP_ALLOWED_ORIGINS,
  allowAny: process.env.COOP_ALLOW_ANY_ORIGIN === '1',
});
let nextConnectionId = 1;
let shuttingDown = false;

interface ConnectionSession {
  room: CoopRoom;
  playerId: CoopPlayerId;
}

const roomCode = (): string => {
  for (;;) {
    const bytes = randomBytes(6);
    const code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    if (!rooms.has(code)) return code;
  }
};

const send = (socket: WebSocket, message: CoopServerMessage): void => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

const httpServer = createServer((request, response) => {
  if (request.url === '/healthz') {
    response.writeHead(shuttingDown ? 503 : 200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      ok: !shuttingDown,
      rooms: rooms.size,
      maxRooms,
      connections: webSocketServer.clients.size,
      maxConnections,
    }));
    return;
  }
  response.writeHead(404);
  response.end();
});

const webSocketServer = new WebSocketServer({
  server: httpServer,
  maxPayload: 64 * 1024,
  verifyClient: ({ origin }: { origin: string }) => {
    if (shuttingDown) return false;
    if (webSocketServer.clients.size >= maxConnections) {
      coopDevWarn('connection.rejected', { reason: 'server-capacity', origin: origin || null });
      return false;
    }
    const allowed = originPolicy.allows(origin);
    if (!allowed) coopDevWarn('connection.rejected', { reason: 'origin-not-allowed', origin: origin || null });
    return allowed;
  },
});
webSocketServer.on('connection', (socket) => {
  const connectionId = nextConnectionId;
  nextConnectionId += 1;
  let session: ConnectionSession | null = null;
  coopDevLog('connection.opened', { connectionId });
  socket.on('message', (payload) => {
    const rawText = payload.toString();
    let raw: unknown;
    try {
      raw = JSON.parse(rawText);
    } catch {
      coopDevWarn('message.rejected', { connectionId, reason: 'invalid-json', bytes: Buffer.byteLength(rawText) });
      send(socket, { type: 'rejected', reason: 'invalid-json' });
      return;
    }
    const message = parseCoopClientMessage(raw);
    if (!message) {
      const receivedType = raw && typeof raw === 'object' && 'type' in raw ? String(raw.type) : null;
      coopDevWarn('message.rejected', {
        connectionId,
        reason: 'invalid-message',
        receivedType,
        bytes: Buffer.byteLength(rawText),
      });
      send(socket, { type: 'rejected', reason: 'invalid-message' });
      return;
    }
    if (session) {
      if (message.type === 'create-room' || message.type === 'join-room' || message.type === 'resume-room') {
        coopDevWarn('message.rejected', {
          connectionId,
          room: session.room.code,
          playerId: session.playerId,
          messageType: message.type,
          reason: 'already-in-room',
        });
        send(socket, { type: 'rejected', reason: 'already-in-room' });
        return;
      }
      session.room.handle(session.playerId, message, socket);
      return;
    }
    if (message.type !== 'create-room' && message.type !== 'join-room' && message.type !== 'resume-room') {
      coopDevWarn('message.rejected', { connectionId, messageType: message.type, reason: 'not-in-room' });
      send(socket, { type: 'rejected', reason: 'not-in-room' });
      return;
    }
    if (message.protocolVersion !== COOP_PROTOCOL_VERSION) {
      coopDevWarn('message.rejected', {
        connectionId,
        messageType: message.type,
        reason: 'protocol-mismatch',
        expectedProtocol: COOP_PROTOCOL_VERSION,
        receivedProtocol: message.protocolVersion,
      });
      send(socket, { type: 'rejected', reason: 'protocol-mismatch' });
      return;
    }
    if (message.type === 'create-room') {
      if (rooms.size >= maxRooms) {
        coopDevWarn('message.rejected', { connectionId, messageType: message.type, reason: 'server-capacity' });
        send(socket, { type: 'rejected', reason: 'server-capacity' });
        return;
      }
      const level = LEVELS.find((candidate) => candidate.id === message.levelId);
      if (!level || level.id === TUTORIAL_LEVEL_ID) {
        coopDevWarn('message.rejected', {
          connectionId,
          messageType: message.type,
          reason: 'invalid-coop-level',
          levelId: message.levelId,
        });
        send(socket, { type: 'rejected', reason: 'invalid-coop-level' });
        return;
      }
      const code = roomCode();
      const seed = randomBytes(4).readUInt32LE(0);
      const room = new CoopRoom({
        code,
        hostName: message.name,
        hostSocket: socket,
        levelId: message.levelId,
        difficultyId: message.difficultyId,
        seed,
        onClosed: (closed) => rooms.delete(closed.code),
        verifyCombat: combatVerifier.verify,
      });
      rooms.set(code, room);
      session = { room, playerId: 'p1' };
      coopDevLog('room.created', {
        connectionId,
        room: code,
        playerId: session.playerId,
        levelId: message.levelId,
        difficultyId: message.difficultyId,
        roomSeed: seed,
      });
      room.sendSession(room.players.p1!);
      return;
    }
    const room = rooms.get(message.code.toUpperCase());
    if (!room) {
      coopDevWarn('message.rejected', {
        connectionId,
        messageType: message.type,
        reason: 'room-not-found',
        room: message.code.toUpperCase(),
      });
      send(socket, { type: 'rejected', reason: 'room-not-found' });
      return;
    }
    if (message.type === 'join-room') {
      const player = room.join(message.name, socket);
      if (!player) {
        coopDevWarn('message.rejected', {
          connectionId,
          messageType: message.type,
          reason: 'room-unavailable',
          room: room.code,
          phase: room.phase,
        });
        send(socket, { type: 'rejected', reason: 'room-unavailable' });
        return;
      }
      session = { room, playerId: player.id };
      coopDevLog('room.joined', { connectionId, room: room.code, playerId: player.id });
      room.sendSession(player);
      return;
    }
    const player = room.resume(message.token, socket);
    if (!player) {
      coopDevWarn('message.rejected', {
        connectionId,
        messageType: message.type,
        reason: 'resume-unavailable',
        room: room.code,
      });
      send(socket, { type: 'rejected', reason: 'resume-unavailable' });
      return;
    }
    session = { room, playerId: player.id };
    coopDevLog('room.resumed', {
      connectionId,
      room: room.code,
      playerId: player.id,
      phase: room.phase,
      phaseId: room.phaseId,
      revision: room.revision,
    });
  });
  socket.on('error', (error) => {
    coopDevError('connection.error', {
      connectionId,
      room: session?.room.code ?? null,
      playerId: session?.playerId ?? null,
      error: error.message,
    });
  });
  socket.on('close', (code) => {
    coopDevLog('connection.closed', {
      connectionId,
      room: session?.room.code ?? null,
      playerId: session?.playerId ?? null,
      code,
    });
    if (!session) return;
    if (code === 4000) session.room.leave(session.playerId, socket);
    else session.room.disconnect(session.playerId, socket);
  });
});

httpServer.on('error', (error) => {
  coopDevError('server.http-error', { host, port, error: error.message });
  process.exitCode = 1;
  void combatVerifier.close();
});

webSocketServer.on('error', (error) => {
  coopDevError('server.websocket-error', { host, port, error: error.message });
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  coopDevLog('server.stopping', { signal, rooms: rooms.size, connections: webSocketServer.clients.size });
  if (httpServer.listening) httpServer.close();
  webSocketServer.close();
  for (const socket of webSocketServer.clients) socket.close(1012, 'Server restarting');
  await combatVerifier.close();
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

httpServer.listen(port, host, () => {
  const address = httpServer.address();
  const listeningPort = address && typeof address === 'object' ? address.port : port;
  process.stdout.write(`Prism Bastion co-op server listening on ws://${host}:${listeningPort}\n`);
  coopDevLog('server.listening', {
    host,
    port: listeningPort,
    combatWorkerCount,
    combatQueueLimit,
    maxRooms,
    maxConnections,
  });
});
