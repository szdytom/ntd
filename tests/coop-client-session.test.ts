/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoopClient } from '../src/coop/client';

const SESSION_KEY = 'prism-bastion-coop-session-v2';
const LEGACY_SESSION_KEY = 'prism-bastion-coop-session-v1';

class FakeWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;

  constructor(url: string | URL) {
    super();
    this.url = String(url);
  }

  send(): void {}
  close(): void { this.readyState = FakeWebSocket.CLOSED; }
}

describe('co-op client session endpoint binding', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('resumes against the node that issued the stored credential', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      code: 'ABC234',
      token: 'a-secure-resume-token',
      playerId: 'p1',
      serverUrl: 'wss://hk.example/ws',
    }));
    const client = new CoopClient();

    client.open();

    const socket = client['socket'] as unknown as FakeWebSocket;
    expect(socket.url).toBe('wss://hk.example/ws');
  });

  it('discards legacy sessions that were not bound to a server', () => {
    sessionStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({
      code: 'ABC234', token: 'a-secure-resume-token', playerId: 'p1',
    }));

    const client = new CoopClient();

    expect(client.storedSession).toBeNull();
    expect(sessionStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
  });
});
