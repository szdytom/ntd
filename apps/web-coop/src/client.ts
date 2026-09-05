import { COOP_PROTOCOL_VERSION } from '@prism-bastion/coop/types';
import { parseCoopServerMessage } from '@prism-bastion/coop/protocol';
import { currentCoopServerUrl, isValidStoredServerUrl } from './server-config';
import type { CoopClientMessage, CoopPlayerId, CoopServerMessage } from '@prism-bastion/coop/types';

const SESSION_KEY = 'prism-bastion-coop-session-v2';
const LEGACY_SESSION_KEY = 'prism-bastion-coop-session-v1';

interface StoredSession {
  code: string;
  token: string;
  playerId: CoopPlayerId;
  serverUrl: string;
}

const readStoredSession = (): StoredSession | null => {
  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof value.code !== 'string' || typeof value.token !== 'string'
      || (value.playerId !== 'p1' && value.playerId !== 'p2')
      || !isValidStoredServerUrl(value.serverUrl)
    ) return null;
    return value as StoredSession;
  } catch {
    return null;
  }
};

type Listener = (message: CoopServerMessage) => void;
type StatusListener = (status: 'idle' | 'connecting' | 'connected' | 'disconnected') => void;

export class CoopClient {
  private socket: WebSocket | null = null;
  private listener: Listener | null = null;
  private statusListener: StatusListener | null = null;
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;
  private pendingInitial: CoopClientMessage | null = null;
  private session = readStoredSession();

  get storedSession(): StoredSession | null {
    return this.session;
  }

  subscribe(listener: Listener, statusListener: StatusListener): () => void {
    this.listener = listener;
    this.statusListener = statusListener;
    return () => {
      this.listener = null;
      this.statusListener = null;
    };
  }

  open(initial?: CoopClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      if (initial) this.socket.send(JSON.stringify(initial));
      return;
    }
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      if (initial) this.pendingInitial = initial;
      return;
    }
    this.pendingInitial = initial ?? null;
    this.manuallyClosed = false;
    this.statusListener?.('connecting');
    const targetServerUrl = initial ? currentCoopServerUrl() : this.session?.serverUrl ?? currentCoopServerUrl();
    const socket = new WebSocket(targetServerUrl);
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.statusListener?.('connected');
      const message = this.pendingInitial ?? (this.session ? {
        type: 'resume-room' as const,
        protocolVersion: COOP_PROTOCOL_VERSION,
        code: this.session.code,
        token: this.session.token,
      } : null);
      this.pendingInitial = null;
      if (message) socket.send(JSON.stringify(message));
    });
    socket.addEventListener('message', (event) => {
      if (this.manuallyClosed) return;
      let raw: unknown;
      try {
        raw = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const message = parseCoopServerMessage(raw);
      if (!message) return;
      if (message.type === 'session') {
        this.session = {
          code: message.room.code,
          token: message.token,
          playerId: message.playerId,
          serverUrl: targetServerUrl,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
      }
      if (message.type === 'rejected' && (message.reason === 'room-not-found' || message.reason === 'resume-unavailable')) {
        this.clearSession();
      }
      if (message.type === 'room-ended') {
        this.clearSession();
        this.listener?.(message);
        if (this.socket === socket) this.socket = null;
        socket.close(1000, 'Room ended');
        this.statusListener?.('idle');
        return;
      }
      this.listener?.(message);
    });
    socket.addEventListener('close', (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.manuallyClosed || event.code === 4001) {
        this.manuallyClosed = true;
        this.clearSession();
        this.statusListener?.('idle');
        return;
      }
      this.statusListener?.('disconnected');
      if (!this.manuallyClosed && this.session) {
        this.reconnectTimer = window.setTimeout(() => this.open(), 1_000);
      }
    });
  }

  send(message: CoopClientMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  close(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'leave-room' } satisfies CoopClientMessage));
      socket.close(4000, 'Player left room');
    } else socket?.close();
    this.socket = null;
    this.clearSession();
    this.statusListener?.('idle');
  }

  clearSession(): void {
    this.session = null;
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  }
}
