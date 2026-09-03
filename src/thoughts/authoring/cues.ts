import type { ThoughtCue } from '../types';

export const LOADOUT_ADDITION_CADENCE = 0.65;

type TimedCueOptions = Omit<ThoughtCue, 'id' | 'duration'>;

export const timedCue = (
  id: string,
  duration: number,
  options: TimedCueOptions = {},
): ThoughtCue => ({ id, duration, ...options });

type WaitCueOptions = Omit<ThoughtCue, 'id' | 'duration'> & { readonly timeout: number };

export const waitCue = (id: string, options: WaitCueOptions): ThoughtCue => ({ id, ...options });
