import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';
import {
  decodeOrchestration,
  encodeOrchestration,
  ORCHESTRATION_MODULE_IDS,
} from '@prism-bastion/game-core/game/orchestration-codec';
import { TARGETING_MODES } from '@prism-bastion/game-core/game/types';

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const encodeRawBody = (bodyValues: readonly number[]): string => {
  const body = Uint8Array.from(bodyValues);
  const checksum = crc32(body);
  const bytes = Uint8Array.from([
    ...body,
    checksum >>> 24,
    checksum >>> 16,
    checksum >>> 8,
    checksum,
  ]);
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let token = '';
  while (value > 0n) {
    token = BASE62_ALPHABET[Number(value % 62n)] + token;
    value /= 62n;
  }
  return token;
};

describe('orchestration token codec', () => {
  it('locks the v1 wire format with stable vectors', () => {
    expect(encodeOrchestration({ slots: [], targeting: 'core-nearest' })).toBe('SRxtaqD9yuIB');
    expect(encodeOrchestration({
      slots: ['pulse', null, 'arcbolt'],
      targeting: 'hp-highest',
    })).toBe('WIpG0OVtJ8xjari9');
    expect(encodeOrchestration({
      slots: ['pulse', 'prism-slug', 'needle', 'void-beam', 'nova', 'geode-bloom', 'overdrive', 'frost'],
      targeting: 'density-lowest',
    })).toBe('A5Jl2JVHSklNptlxTbTS8KI');
  });

  it('round-trips holes and every targeting mode while trimming trailing empty slots', () => {
    for (const targeting of TARGETING_MODES) {
      const token = encodeOrchestration({ slots: ['arcbolt', null, 'pulse', null, null], targeting });
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
      expect(token.length).toBeLessThanOrEqual(23);
      expect(decodeOrchestration(token)).toEqual({
        ok: true,
        value: { slots: ['arcbolt', null, 'pulse'], targeting },
      });
    }
  });

  it('rejects damaged, malformed, and non-canonical tokens', () => {
    const token = encodeOrchestration({ slots: ['pulse', 'frost'], targeting: 'core-nearest' });
    const replacement = token.endsWith('0') ? '1' : '0';
    expect(decodeOrchestration(`${token.slice(0, -1)}${replacement}`)).toEqual({ ok: false, reason: 'invalid-checksum' });
    expect(decodeOrchestration(`0${token}`)).toEqual({ ok: false, reason: 'invalid-format' });
    expect(decodeOrchestration(`${token}!`)).toEqual({ ok: false, reason: 'invalid-format' });
    expect(decodeOrchestration(token.slice(1))).toEqual({ ok: false, reason: 'invalid-checksum' });
  });

  it('distinguishes incompatible versions, reserved features, and module codes', () => {
    expect(decodeOrchestration(encodeRawBody([0x50, 0x42, 2, 0, 0]))).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
    expect(decodeOrchestration(encodeRawBody([0x50, 0x42, 1, 0x01, 0]))).toEqual({
      ok: false,
      reason: 'unsupported-feature',
    });
    expect(decodeOrchestration(encodeRawBody([0x50, 0x42, 1, 0, 0x01]))).toEqual({
      ok: false,
      reason: 'unsupported-feature',
    });
    expect(decodeOrchestration(encodeRawBody([0x50, 0x42, 1, 0x10, 0, 0xff]))).toEqual({
      ok: false,
      reason: 'unknown-module',
    });
  });

  it('keeps the explicit wire codebook aligned with the complete registry', () => {
    expect(ORCHESTRATION_MODULE_IDS).toHaveLength(40);
    expect(new Set(ORCHESTRATION_MODULE_IDS).size).toBe(ORCHESTRATION_MODULE_IDS.length);
    expect(new Set(ORCHESTRATION_MODULE_IDS)).toEqual(new Set(createModuleRegistry().list().map(({ id }) => id)));
  });

  it('rejects values that cannot be represented by v1', () => {
    expect(() => encodeOrchestration({
      slots: [...Array<null>(15).fill(null), 'pulse'],
      targeting: 'core-nearest',
    })).toThrow(RangeError);
    expect(() => encodeOrchestration({ slots: ['future-module'], targeting: 'core-nearest' })).toThrow(TypeError);
  });
});
