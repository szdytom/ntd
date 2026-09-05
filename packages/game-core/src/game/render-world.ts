import type { ModuleRegistry } from '../modules';
import type { VisualFeedbackSink } from '../visual-feedback';
import type { LevelDefinition } from './config';
import type { PathSampler } from './path';
import type { SessionRules } from './session-rules';
import type {
  FloatingText,
  GameViewSnapshot,
  Point,
  Projectile,
  Signal,
  SpaceRift,
  SplitRift,
  Tower,
} from './types';

/** The immutable access boundary consumed by combat renderers. */
export interface RenderWorld {
  readonly towers: readonly Tower[];
  readonly signals: readonly Signal[];
  readonly projectiles: readonly Projectile[];
  readonly spaceRifts: readonly SpaceRift[];
  readonly floatingTexts: readonly FloatingText[];
  readonly visuals: VisualFeedbackSink;
  readonly modules: ModuleRegistry;
  readonly level: LevelDefinition;
  readonly rules: SessionRules;
  readonly elapsed: number;
  readonly visualElapsed: number;
  readonly pointer: Point | null;
  readonly selectedTowerId: number | null;

  getViewSnapshot(): GameViewSnapshot;
  getSelectedTower(): Tower | null;
  getSplitRifts(): readonly SplitRift[];
  getTowerColor(tower: Tower): string;
  getCorePosition(): Point;
  routeFor(routeId: string): PathSampler;
}
