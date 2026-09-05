import { describe, expect, it } from 'vitest';
import { readCoopServerConfig } from '../src/server/config';

describe('co-op server runtime configuration', () => {
  it('provides bounded production defaults', () => {
    expect(readCoopServerConfig({})).toEqual({
      host: '0.0.0.0',
      port: 4174,
      combatWorkerCount: 1,
      combatQueueLimit: 128,
      maxRooms: 64,
      maxConnections: 256,
    });
  });

  it('accepts explicit capacity settings', () => {
    expect(readCoopServerConfig({
      COOP_HOST: '127.0.0.1',
      COOP_SERVER_PORT: '0',
      COOP_COMBAT_WORKERS: '2',
      COOP_COMBAT_QUEUE_LIMIT: '96',
      COOP_MAX_ROOMS: '48',
      COOP_MAX_CONNECTIONS: '128',
    })).toEqual({
      host: '127.0.0.1',
      port: 0,
      combatWorkerCount: 2,
      combatQueueLimit: 96,
      maxRooms: 48,
      maxConnections: 128,
    });
  });

  it.each([
    ['COOP_SERVER_PORT', '-1'],
    ['COOP_COMBAT_WORKERS', '0'],
    ['COOP_COMBAT_QUEUE_LIMIT', '12.5'],
    ['COOP_MAX_ROOMS', 'unlimited'],
    ['COOP_MAX_CONNECTIONS', '1'],
  ])('rejects invalid %s values', (name, value) => {
    expect(() => readCoopServerConfig({ [name]: value })).toThrow(name);
  });
});
