import type { ThoughtBeat, ThoughtCue } from '../types';

export interface AuthoredBeat extends Omit<ThoughtBeat, 'timelineDuration'> {
  readonly cues: readonly ThoughtCue[];
  readonly timelineDuration?: number;
}

const cueTimelineDuration = (cue: ThoughtCue): number => (
  cue.timelineWait ? 0 : (cue.duration ?? 0)
);

/**
 * Builds a resolved runtime beat. Polished storyboards derive their timeline
 * width from timed cues; legacy event-only beats may provide an estimate while
 * they are migrated to explicit cue sequences.
 */
export const defineBeat = (beat: AuthoredBeat): ThoughtBeat => {
  const derivedDuration = beat.cues.reduce((sum, cue) => sum + cueTimelineDuration(cue), 0);
  const timelineDuration = beat.timelineDuration ?? derivedDuration;
  return { ...beat, timelineDuration };
};
