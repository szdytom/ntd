import type { SignalDefinition } from './types';

export const defineSignal = <const Definition extends SignalDefinition>(definition: Definition): Definition => definition;
