import { z } from 'zod';
import { TARGETING_MODES } from '@prism-bastion/game-core/game/types';
import type { CoopClientMessage, CoopServerMessage } from './types';

const difficulty = z.enum(['relaxed', 'easy', 'normal', 'hard', 'extreme']);
const targeting = z.enum(TARGETING_MODES);
const revision = z.number().int().nonnegative();
const moduleId = z.string().min(1).max(80);

const planningCommand = z.discriminatedUnion('type', [
  z.object({ type: z.literal('place-tower'), padIndex: z.number().int().nonnegative() }),
  z.object({ type: z.literal('upgrade-tower'), towerId: z.number().int().positive() }),
  z.object({ type: z.literal('set-targeting'), towerId: z.number().int().positive(), targeting }),
  z.object({
    type: z.literal('install-module'),
    towerId: z.number().int().positive(),
    slotIndex: z.number().int().nonnegative(),
    moduleId: moduleId.nullable(),
  }),
  z.object({
    type: z.literal('swap-modules'),
    towerId: z.number().int().positive(),
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal('clear-loadout'), towerId: z.number().int().positive() }),
]);

const leakedSignal = z.object({
  ordinal: z.number().int().nonnegative(),
  type: z.string().min(1).max(80),
  variantId: z.string().min(1).max(80),
  entrance: z.string().min(1).max(120),
});

export const coopClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create-room'),
    protocolVersion: z.number().int(),
    name: z.string().trim().min(1).max(20),
    levelId: z.string().min(1).max(80),
    difficultyId: difficulty,
  }),
  z.object({
    type: z.literal('join-room'),
    protocolVersion: z.number().int(),
    name: z.string().trim().min(1).max(20),
    code: z.string().trim().min(4).max(10),
  }),
  z.object({
    type: z.literal('resume-room'),
    protocolVersion: z.number().int(),
    code: z.string().trim().min(4).max(10),
    token: z.string().min(16).max(200),
  }),
  z.object({ type: z.literal('plan-command'), expectedRevision: revision, command: planningCommand }),
  z.object({
    type: z.literal('transfer-shards'),
    expectedRevision: revision,
    amount: z.number().int().positive().max(1_000_000),
  }),
  z.object({ type: z.literal('set-ready'), expectedRevision: revision, ready: z.boolean() }),
  z.object({
    type: z.literal('draft-decision'),
    expectedRevision: revision,
    choice: moduleId.nullable(),
  }),
  z.object({
    type: z.literal('combat-result'),
    expectedRevision: revision,
    result: z.object({
      phaseId: z.number().int().positive(),
      planHash: z.string().regex(/^[0-9a-f]{8}$/),
      shardsEarned: z.number().int().nonnegative().max(1_000_000),
      leaks: z.array(leakedSignal).max(1_000),
    }),
  }),
  z.object({ type: z.literal('leave-room') }),
]);

export function parseCoopClientMessage(value: unknown): CoopClientMessage | null {
  const result = coopClientMessageSchema.safeParse(value);
  return result.success ? result.data as CoopClientMessage : null;
}

export function parseCoopServerMessage(value: unknown): CoopServerMessage | null {
  if (!value || typeof value !== 'object' || !('type' in value)) return null;
  return value as CoopServerMessage;
}
