import type { CombatEventListener } from './combat-events';
import type { LevelDefinition } from './config';
import { GameEngine } from './engine';
import { legacyPathToGraph } from './path';
import type { RouteMap } from './path';
import type { RenderWorld } from './render-world';
import type { ModuleId, Point, Projectile, Signal, SignalId, TowerProgram } from './types';
import type { VisualFeedbackSink } from '../visual-feedback';

export interface CombatSceneModel {
  readonly id: string;
  readonly path: readonly Point[];
  readonly tower: Point;
  readonly graph?: RouteMap;
  readonly towerPads?: readonly Point[];
  readonly camera?: {
    readonly center: Point;
    readonly height: number;
    readonly bottomFocus?: { readonly worldY: number; readonly padding: number };
  };
  readonly accent?: string;
  readonly signalHealthScale?: number;
  readonly signalSpeedScale?: number;
  readonly towerSlots?: number;
}

const levelFromScene = (scene: CombatSceneModel): LevelDefinition => ({
  id: `thought:${scene.id}`,
  name: scene.id,
  sector: 'THOUGHT',
  difficulty: 1,
  accent: scene.accent ?? '#6c5ce7',
  graph: scene.graph ?? legacyPathToGraph(scene.path, `thought:${scene.id}`),
  towerPads: scene.towerPads ?? [scene.tower],
  waves: [[]],
  moduleDraft: {
    initialPicks: 1,
    wavePicks: 1,
    qualityAnchors: [1],
    qualityBias: 0,
    inventoryInfluence: 0,
    abandonLimit: 0,
  },
  startingShards: 0,
  signalHealthScale: scene.signalHealthScale ?? 0.72,
  signalSpeedScale: scene.signalSpeedScale ?? 0.85,
});

export interface ScenarioSetup {
  readonly slots: readonly ModuleId[];
  readonly seed?: number;
}

export interface ScenarioTowerSetup {
  readonly towerIndex: number;
  readonly slots: readonly ModuleId[];
}

export type ScenarioSignalPosition =
  | {
    readonly type: 'route-progress';
    readonly progress: number;
    readonly entrance?: string;
  }
  | {
    readonly type: 'tower-range-entry';
    readonly leadDistance?: number;
    readonly towerIndex?: number;
    readonly entrance?: string;
  };

/**
 * A session-free control surface for authored combat scenes.
 *
 * The adapter deliberately exposes no economy, draft, wave, archive, or mode
 * commands. It reuses the same compiler, combat loop, visuals, and renderer as
 * a live defense while the larger engine extraction remains behavior-neutral.
 */
export class CombatRuntime {
  readonly engine: GameEngine;
  readonly world: RenderWorld;
  private readonly heldTowerCooldowns = new Map<number, number>();

  constructor(seed = 1, readonly scene?: CombatSceneModel, visuals?: VisualFeedbackSink) {
    this.engine = new GameEngine({
      mode: 'creative',
      ...(scene ? { level: levelFromScene(scene) } : { levelId: 'starter-elbow' }),
      seed,
      ...(visuals ? { visuals } : {}),
      creative: { healthScale: 0.72, speedScale: 0.85, coreStability: 20, waveCount: 1 },
    });
    this.engine.setAutoPauseEnabled(false);
    this.ensureSceneTowers();
    this.world = this.engine;
  }

  subscribe(listener: CombatEventListener): () => void {
    return this.engine.subscribeCombat(listener);
  }

  update(delta: number): void {
    this.engine.update(delta);
  }

  setup({ slots }: ScenarioSetup): TowerProgram {
    const program = this.setupTowers([{ towerIndex: 0, slots }])[0];
    if (!program) throw new Error('Thought scenario tower could not be compiled');
    return program;
  }

  setupTowers(loadouts: readonly ScenarioTowerSetup[]): readonly TowerProgram[] {
    this.heldTowerCooldowns.clear();
    this.engine.reset();
    this.engine.setAutoPauseEnabled(false);
    this.ensureSceneTowers();
    for (const tower of this.engine.towers) {
      const requestedSlots = this.scene?.towerSlots ?? tower.slots.length;
      while (tower.slots.length < requestedSlots) tower.slots.push(null);
      this.engine.selectTower(tower.id);
      this.engine.clearLoadout();
    }
    const programs = loadouts.map(({ towerIndex, slots }) => {
      const tower = this.engine.towers[towerIndex];
      if (!tower) throw new Error(`Thought scenario requires tower ${towerIndex}`);
      this.engine.selectTower(tower.id);
      slots.forEach((moduleId, index) => this.engine.installModule(index, moduleId));
      const program = this.engine.compileTowerProgram(tower.id);
      if (!program) throw new Error(`Thought scenario tower ${towerIndex} could not be compiled`);
      return program;
    });
    this.engine.selectTower(this.engine.towers[0]?.id ?? null);
    return programs;
  }

  compile(): TowerProgram {
    const tower = this.engine.towers[0];
    if (!tower) throw new Error('Thought scenarios require one tower');
    const program = this.engine.compileTowerProgram(tower.id);
    if (!program) throw new Error('Thought scenario tower could not be compiled');
    return program;
  }

  spawnSignal(type: SignalId, position: ScenarioSignalPosition = { type: 'route-progress', progress: 0 }): Signal {
    let routeProgress = position.type === 'route-progress' ? position.progress : 0;
    const routeId = position.entrance ?? this.engine.level.graph.entrances[0];
    if (!routeId) throw new Error('Thought scenarios require one tower route');
    if (position.type === 'tower-range-entry') {
      const tower = this.engine.towers[position.towerIndex ?? 0];
      if (!tower || !routeId) throw new Error('Thought scenarios require one tower route');
      const range = this.engine.estimateTowerAttackProgressRange(tower.id, routeId);
      if (!range) throw new Error('Thought scenario route never enters tower range');
      const route = this.engine.routeFor(routeId);
      routeProgress = range.minimum - (position.leadDistance ?? 0) / route.length;
    }
    this.engine.spawnCreativeSignal(type, routeId, routeProgress);
    const signal = this.engine.signals.at(-1);
    if (!signal) throw new Error('Thought scenario could not spawn a signal');
    return signal;
  }

  getSignal(id: number): Signal | null {
    return this.engine.signals.find((signal) => signal.id === id) ?? null;
  }

  getProjectile(id: number): Projectile | null {
    return this.engine.projectiles.find((projectile) => projectile.id === id) ?? null;
  }

  setTowerCastingEnabled(enabled: boolean, towerIndex?: number): void {
    const towers = towerIndex === undefined
      ? this.engine.towers
      : this.engine.towers[towerIndex] ? [this.engine.towers[towerIndex]!] : [];
    if (towers.length === 0) throw new Error(`Thought scenario requires tower ${towerIndex}`);
    if (!enabled) {
      for (const tower of towers) {
        if (this.heldTowerCooldowns.has(tower.id)) continue;
        this.heldTowerCooldowns.set(tower.id, tower.cooldownLeft);
        tower.cooldownLeft = Number.POSITIVE_INFINITY;
      }
      return;
    }
    for (const tower of towers) {
      const cooldown = this.heldTowerCooldowns.get(tower.id);
      if (cooldown === undefined) continue;
      tower.cooldownLeft = cooldown;
      this.heldTowerCooldowns.delete(tower.id);
    }
  }

  hasActiveSignals(): boolean {
    return this.engine.signals.some((signal) => !signal.dead);
  }

  haveActiveSignalsLeftTowerRanges(): boolean {
    return this.engine.signals.every((signal) => (
      signal.dead || this.engine.towers.every((tower) => (
        Math.hypot(signal.position.x - tower.position.x, signal.position.y - tower.position.y) > tower.range
      ))
    ));
  }

  haveActiveSignalsPassedNode(nodeId: string): boolean {
    if (!this.engine.level.graph.nodes.has(nodeId)) {
      throw new Error(`Unknown thought scenario route node: ${nodeId}`);
    }
    return this.engine.signals.every((signal) => {
      if (signal.dead) return true;
      let distanceToNode = 0;
      let current = this.engine.level.graph.nodes.get(signal.routeId);
      while (current && current.id !== nodeId) {
        if (current.parent === null) return false;
        const parent = this.engine.level.graph.nodes.get(current.parent);
        if (!parent) return false;
        distanceToNode += Math.hypot(
          parent.position.x - current.position.x,
          parent.position.y - current.position.y,
        );
        current = parent;
      }
      return current?.id === nodeId && signal.distance >= distanceToNode;
    });
  }

  deleteSignals(): number {
    return this.engine.deleteSignals(this.engine.signals.map((signal) => signal.id));
  }

  hasFullTowerEnergy(): boolean {
    return this.engine.towers.every((tower) => tower.energy >= tower.maxEnergy);
  }

  dispose(): void {
    this.engine.visuals.clear();
  }

  private ensureSceneTowers(): void {
    const towerCount = this.scene?.towerPads?.length ?? 1;
    for (let index = this.engine.towers.length; index < towerCount; index += 1) {
      this.engine.placeTower(index);
    }
    this.engine.visuals.clear();
  }

}
