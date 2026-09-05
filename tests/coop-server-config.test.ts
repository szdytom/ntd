import { describe, expect, it } from 'vitest';
import { resolveCoopServerUrl } from '../apps/web-coop/src/server-config';
import { createWebSocketOriginPolicy } from '../apps/coop-server/src/origin-policy';

describe('co-op public server selection', () => {
  const location = { search: '', protocol: 'https:', hostname: 'cdn.example' };
  const servers = {
    hk: 'wss://hk.example/ws',
    'us-west': 'wss://us-west.example/ws',
  };

  it('selects only configured server IDs in production', () => {
    expect(resolveCoopServerUrl({ ...location, search: '?server=us-west' }, servers)).toBe(servers['us-west']);
    expect(resolveCoopServerUrl({ ...location, search: '?server=wss://attacker.example' }, servers)).toBe(servers.hk);
    expect(resolveCoopServerUrl(location, servers)).toBe(servers.hk);
  });

  it('keeps arbitrary WebSocket overrides limited to development', () => {
    const development = { search: '?server=ws://127.0.0.1:4274', protocol: 'http:', hostname: '127.0.0.1' };
    expect(resolveCoopServerUrl(development, {}, true)).toBe('ws://127.0.0.1:4274');
    expect(resolveCoopServerUrl(development, {}, false)).toBe('ws://127.0.0.1:4174');
  });
});

describe('co-op WebSocket Origin policy', () => {
  it('fails closed without an explicit production policy', () => {
    expect(() => createWebSocketOriginPolicy({})).toThrow(/COOP_ALLOWED_ORIGINS/);
  });

  it('accepts only normalized configured origins', () => {
    const policy = createWebSocketOriginPolicy({
      allowedOrigins: 'https://cdn.example, https://preview.example:8443/',
    });
    expect(policy.allows('https://cdn.example')).toBe(true);
    expect(policy.allows('https://preview.example:8443')).toBe(true);
    expect(policy.allows('https://attacker.example')).toBe(false);
    expect(policy.allows(undefined)).toBe(false);
  });

  it('allows unrestricted origins only through the explicit development switch', () => {
    const policy = createWebSocketOriginPolicy({ allowAny: true });
    expect(policy.allows(undefined)).toBe(true);
    expect(policy.allows('https://attacker.example')).toBe(true);
  });
});
