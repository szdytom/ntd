import { anvilSignal } from './anvil';
import { blockSignal } from './block';
import { crownSignal } from './crown';
import { fractureSignal } from './fracture';
import { hexSignal } from './hex';
import { kiteSignal } from './kite';
import { menderSignal } from './mender';
import { radiantSignal } from './radiant';
import { sparkSignal } from './spark';
import { surgeSignal } from './surge';
import type { SignalDefinition, SignalVariantDefinition } from './types';

export const SIGNAL_DEFINITIONS = [
  sparkSignal, surgeSignal, kiteSignal, blockSignal, hexSignal, menderSignal,
  crownSignal, fractureSignal, anvilSignal, radiantSignal,
] as const satisfies readonly SignalDefinition[];

export type SignalId = typeof SIGNAL_DEFINITIONS[number]['id'];
type VariantIdOf<Definition> = Definition extends { variants: readonly (infer Variant)[] }
  ? Variant extends { id: infer Id extends string } ? Id : never
  : never;
export type SignalVariantId = SignalId | VariantIdOf<typeof SIGNAL_DEFINITIONS[number]>;

class SignalRegistry {
  private readonly byId = new Map<SignalId, SignalDefinition<SignalId>>();
  private readonly variantById = new Map<string, SignalVariantDefinition>();
  private readonly variantOwnerById = new Map<string, SignalId>();

  constructor(private readonly definitions: readonly SignalDefinition<SignalId>[]) {
    for (const definition of definitions) {
      if (this.byId.has(definition.id)) throw new Error(`Duplicate signal definition: ${definition.id}`);
      this.byId.set(definition.id, definition);
      for (const variant of definition.variants ?? []) {
        if (this.byId.has(variant.id as SignalId) || this.variantById.has(variant.id)) {
          throw new Error(`Duplicate signal variant: ${variant.id}`);
        }
        this.variantById.set(variant.id, variant);
        this.variantOwnerById.set(variant.id, definition.id);
      }
    }
  }

  require(id: SignalId): SignalDefinition<SignalId> {
    const definition = this.byId.get(id);
    if (!definition) throw new Error(`Unregistered signal: ${id}`);
    return definition;
  }

  list(): readonly SignalDefinition<SignalId>[] {
    return this.definitions;
  }

  ids(): readonly SignalId[] {
    return this.definitions.map((definition) => definition.id);
  }

  variants(): readonly SignalVariantId[] {
    const variants: SignalVariantId[] = [];
    for (const definition of this.definitions) {
      variants.push(definition.id);
      variants.push(...(definition.variants ?? []).map((variant) => variant.id as SignalVariantId));
    }
    return variants;
  }

  variant(id: SignalVariantId): SignalVariantDefinition | undefined {
    return this.variantById.get(id);
  }

  signalIdForVariant(id: SignalVariantId): SignalId {
    return this.variantOwnerById.get(id) ?? id as SignalId;
  }
}

export const signalRegistry = new SignalRegistry(SIGNAL_DEFINITIONS);
export const SIGNAL_IDS = signalRegistry.ids();
export const DEFAULT_SIGNAL_ID: SignalId = SIGNAL_DEFINITIONS[0].id;
