import { TARGETING_MODES } from './types';
import type { ModuleId, TargetingMode, TowerOrchestration } from './types';

const MAGIC_HIGH = 0x50;
const MAGIC_LOW = 0x42;
const FORMAT_VERSION = 1;
const MAX_TOKEN_LENGTH = 64;
const CRC_LENGTH = 4;
const FIXED_BODY_LENGTH = 5;
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE62_RADIX = 62n;

/**
 * Stable wire identifiers. Never reorder or reuse an entry; append new modules.
 * Zero is reserved for an empty slot, leaving identifiers 1 through 255 available.
 */
export const ORCHESTRATION_MODULE_IDS = Object.freeze([
  'pulse',
  'prism-slug',
  'needle',
  'void-beam',
  'nova',
  'geode-bloom',
  'overdrive',
  'frost',
  'double-fork',
  'fork',
  'echo',
  'seeker',
  'arcbolt',
  'resonant-trail',
  'cinder-trail',
  'starfire-trail',
  'rift-trail',
  'razor',
  'ricochet',
  'ember-coating',
  'toxin',
  'searing-sigil',
  'starfire-matrix',
  'colossus',
  'focus-core',
  'condense-core',
  'barrage',
  'economizer',
  'emergency-battery',
  'reclaim-circuit',
  'proximity-mine',
  'rift-barrier',
  'singularity',
  'tesla-node',
  'ember-field',
  'toxic-cloud',
  'impact-trigger',
  'timer-trigger',
  'expiration-trigger',
  'terrain-trigger',
] as const satisfies readonly ModuleId[]);

if (
  ORCHESTRATION_MODULE_IDS.length > 0xff
  || new Set(ORCHESTRATION_MODULE_IDS).size !== ORCHESTRATION_MODULE_IDS.length
) {
  throw new Error('Orchestration module codes must be unique and fit in one byte');
}

const moduleCodeById = new Map<ModuleId, number>(
  ORCHESTRATION_MODULE_IDS.map((id, index) => [id, index + 1]),
);

export type OrchestrationDecodeError =
  | 'invalid-format'
  | 'invalid-checksum'
  | 'unsupported-version'
  | 'unsupported-feature'
  | 'unknown-module';

export type OrchestrationDecodeResult =
  | { readonly ok: true; readonly value: TowerOrchestration }
  | { readonly ok: false; readonly reason: OrchestrationDecodeError };

const calculateCrc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const encodeBase62 = (bytes: Uint8Array): string => {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let encoded = '';
  while (value > 0n) {
    encoded = BASE62_ALPHABET[Number(value % BASE62_RADIX)] + encoded;
    value /= BASE62_RADIX;
  }
  return encoded || BASE62_ALPHABET[0]!;
};

const decodeBase62 = (token: string): Uint8Array | null => {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  let value = 0n;
  for (const character of token) {
    const digit = BASE62_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    value = value * BASE62_RADIX + BigInt(digit);
  }
  const reversed: number[] = [];
  while (value > 0n) {
    reversed.push(Number(value & 0xffn));
    value >>= 8n;
  }
  const bytes = Uint8Array.from(reversed.reverse());
  return encodeBase62(bytes) === token ? bytes : null;
};

const isTargetingMode = (value: unknown): value is TargetingMode => (
  TARGETING_MODES.some((mode) => mode === value)
);

export const encodeOrchestration = (orchestration: TowerOrchestration): string => {
  if (!isTargetingMode(orchestration.targeting)) throw new TypeError('Unknown targeting mode');
  let slotCount = orchestration.slots.length;
  while (slotCount > 0 && orchestration.slots[slotCount - 1] === null) slotCount -= 1;
  if (slotCount > 0x0f) throw new RangeError('Orchestration exceeds the v1 slot limit');

  const body = new Uint8Array(FIXED_BODY_LENGTH + slotCount);
  body[0] = MAGIC_HIGH;
  body[1] = MAGIC_LOW;
  body[2] = FORMAT_VERSION;
  body[3] = slotCount << 4; // Low nibble reserves sixteen firing modes; zero is the current mode.
  body[4] = TARGETING_MODES.indexOf(orchestration.targeting) << 5; // Low five bits are reserved flags.
  for (let index = 0; index < slotCount; index += 1) {
    const moduleId = orchestration.slots[index];
    if (moduleId === null) continue;
    if (moduleId === undefined) throw new TypeError('Orchestration slots must be dense');
    const code = moduleCodeById.get(moduleId);
    if (code === undefined) throw new TypeError(`Unknown orchestration module: ${moduleId}`);
    body[FIXED_BODY_LENGTH + index] = code;
  }

  const checksum = calculateCrc32(body);
  const bytes = new Uint8Array(body.length + CRC_LENGTH);
  bytes.set(body);
  const checksumOffset = body.length;
  bytes[checksumOffset] = checksum >>> 24;
  bytes[checksumOffset + 1] = checksum >>> 16;
  bytes[checksumOffset + 2] = checksum >>> 8;
  bytes[checksumOffset + 3] = checksum;
  return encodeBase62(bytes);
};

export const decodeOrchestration = (token: string): OrchestrationDecodeResult => {
  const bytes = decodeBase62(token);
  if (!bytes || bytes.length < FIXED_BODY_LENGTH + CRC_LENGTH) {
    return { ok: false, reason: 'invalid-format' };
  }

  const checksumOffset = bytes.length - CRC_LENGTH;
  const body = bytes.slice(0, checksumOffset);
  const expectedChecksum = (
    bytes[checksumOffset]! * 0x1000000
    + bytes[checksumOffset + 1]! * 0x10000
    + bytes[checksumOffset + 2]! * 0x100
    + bytes[checksumOffset + 3]!
  ) >>> 0;
  if (calculateCrc32(body) !== expectedChecksum) {
    return { ok: false, reason: 'invalid-checksum' };
  }
  if (body[0] !== MAGIC_HIGH || body[1] !== MAGIC_LOW) {
    return { ok: false, reason: 'invalid-format' };
  }
  if (body[2] !== FORMAT_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }

  const slotCount = body[3]! >>> 4;
  const firingMode = body[3]! & 0x0f;
  const targetingCode = body[4]! >>> 5;
  const reservedFlags = body[4]! & 0x1f;
  if (body.length !== FIXED_BODY_LENGTH + slotCount) {
    return { ok: false, reason: 'invalid-format' };
  }
  if (firingMode !== 0 || reservedFlags !== 0) {
    return { ok: false, reason: 'unsupported-feature' };
  }
  const targeting = TARGETING_MODES[targetingCode];
  if (!targeting) return { ok: false, reason: 'invalid-format' };

  const slots: Array<ModuleId | null> = [];
  for (let index = 0; index < slotCount; index += 1) {
    const moduleCode = body[FIXED_BODY_LENGTH + index]!;
    if (moduleCode === 0) {
      slots.push(null);
      continue;
    }
    const moduleId = ORCHESTRATION_MODULE_IDS[moduleCode - 1];
    if (!moduleId) return { ok: false, reason: 'unknown-module' };
    slots.push(moduleId);
  }
  return { ok: true, value: { slots, targeting } };
};
