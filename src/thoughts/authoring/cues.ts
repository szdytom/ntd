import type { ThoughtCue } from '../types';

type TimedCueOptions = Omit<ThoughtCue, 'id' | 'duration'>;

export const timedCue = (
  id: string,
  duration: number,
  options: TimedCueOptions = {},
): ThoughtCue => ({ id, duration, ...options });

type WaitCueOptions = Omit<ThoughtCue, 'id' | 'duration'> & { readonly timeout: number };

export const waitCue = (id: string, options: WaitCueOptions): ThoughtCue => ({ id, ...options });
