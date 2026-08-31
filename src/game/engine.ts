import { EffectEngine } from '../effects/engine';
import { GAME_EFFECT_IDS, gameEffects } from '../effects/game-effects';
import { createModuleRegistry } from '../modules';
import type {
  ModuleCombatApi,
  ModuleKind,
  ModuleRarity,
  StatusApplication,
  TargetEffectChannel,
} from '../modules/types';
import i18n from '../i18n';
import { getSignalCapability, signalRegistry } from '../signals';
import { COMBAT_BALANCE, ECONOMY_BALANCE } from './balance';
import { segmentCircleHitTime, segmentRegularPolygonHitTime } from './collision';
import {
  DEFAULT_LEVEL_ID,
  getLevel,
  resolveSpawnEntrances,
  TOWER_COLORS,
  TUTORIAL_LEVEL_ID,
  WORLD,
  type LevelDefinition,
  type SpawnEntry,
} from './config';
import { DEFAULT_DIFFICULTY_ID, getDifficulty, type DifficultyDefinition } from './difficulty';
import { rollModuleDraft } from './draft';
import { limitSignalContinuousHealthDamage, limitSignalHealthDamage } from '../signals/capabilities/damage-cap';
import { absorbSignalShieldDamage, createSignalShield, isInsideRegularShield, updateSignalShield } from '../signals/capabilities/shield';
import { signalMovementSpeedMultiplier } from '../signals/capabilities/movement';
import { findPathInterception } from './interception';
import { angleBetween, distance, normalize, rotate, seededNoise } from './math';
import { resolveRoute, type NodeId, type PathSampler } from './path';
import { SignalSpatialIndex } from './spatial-index';
import { selectTowerTarget } from './targeting';
import { createSeededRandom, rollTowerStats } from './tower-generation';
import type {
  CreativeSetup,
  DefenseCompletedReport,
  DefenseWaveReport,
  DifficultyId,
  Signal,
  SignalId,
  FloatingText,
  GameEvent,
  GameMode,
  GameSnapshot,
  GameViewSnapshot,
  DefenseArchiveFact,
  ModuleId,
  Point,
  Projectile,
  ScheduledCast,
  ShotBlueprint,
  SpaceRift,
  SpaceRiftContact,
  SplitRift,
  TargetingMode,
  Tower,
  SignalOutcomeTally,
  SignalVariantId,
} from './types';

type Listener = (event: GameEvent) => void;
type ViewListener = () => void;

interface SpawnLane {
  entrance: NodeId;
  queue: SignalId[];
  timer: number;
}
const NO_EXCLUDED_ENEMY_IDS: readonly number[] = [];
const CREATIVE_KIND_ORDER: Readonly<Record<ModuleKind, number>> = {
  projectile: 0,
  static: 1,
  modifier: 2,
  trail: 3,
  logic: 4,
};
const CREATIVE_RARITY_ORDER: Readonly<Record<ModuleRarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

export interface GameEngineOptions {
  seed?: number;
  levelId?: string;
  difficultyId?: DifficultyId;
  mode?: GameMode;
  creative?: Partial<CreativeSetup>;
}

const TUTORIAL_MODULES: Readonly<Record<ModuleId, number>> = {
  frost: 1,
  pulse: 2,
  'impact-trigger': 1,
  'proximity-mine': 1,
};
const MAX_TOWER_LEVEL = 5;
export const FIXED_SIMULATION_STEP = 1 / 120;
export const WAVE_CLEAR_DELAY = 2;
const MAX_FRAME_DELTA = 0.1;
const MAX_SIMULATION_STEPS = 24;
const SIMULATION_TIME_EPSILON = 1e-9;
const SEEKING_RETARGET_RADIUS = 320;
const TERRAIN_TRIGGER_CROSSING_TICKS = 'terrain-trigger:crossing-ticks';
const MAX_ENEMY_COLLISION_RADIUS = Math.max(
  ...signalRegistry.list().map((definition) => Math.max(
    definition.stats.radius,
    getSignalCapability(definition, 'shield')?.radius ?? 0,
  )),
);
const emptySignalTally = (): SignalOutcomeTally => ({
  spawned: 0,
  defeated: 0,
  leaked: 0,
  remaining: 0,
  queued: 0,
  coreDamage: 0,
});
const createRunId = (): string => globalThis.crypto?.randomUUID?.()
  ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const normalizeCreativeCoreStability = (value: number): number => Number.isFinite(value)
  ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value)))
  : 20;
const normalizeCreativeWaveCount = (value: number): number => Number.isFinite(value)
  ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value)))
  : 1;

interface PendingSignalSplit extends SplitRift {
  parent: Signal;
  spawned: boolean;
}

export class GameEngine {
  readonly towers: Tower[] = [];
  readonly signals: Signal[] = [];
  readonly projectiles: Projectile[] = [];
  readonly spaceRifts: SpaceRift[] = [];
  readonly floatingTexts: FloatingText[] = [];
  readonly effects = new EffectEngine();
  readonly modules = createModuleRegistry();
  readonly mode: GameMode;
  readonly level: LevelDefinition;
  readonly difficulty: DifficultyDefinition;
  readonly path: PathSampler;
  readonly tutorialEnabled: boolean;

  status: GameSnapshot['status'] = 'planning';
  wave = 0;
  readonly maxWaves: number;
  core: number;
  readonly maxCore: number;
  shards = 0;
  score = 0;
  selectedTowerId: number | null = null;
  speed = 1;
  paused = false;
  elapsed = 0;
  private combatElapsed = 0;
  visualElapsed = 0;
  pointer: Point | null = null;

  private listeners = new Set<Listener>();
  private viewListeners = new Set<ViewListener>();
  private spawnLanes: SpawnLane[] = [];
  private waveClearDelayLeft: number | null = null;
  private scheduledCasts: ScheduledCast[] = [];
  private pendingSignalSplits: PendingSignalSplit[] = [];
  private nextId = 1;
  private dirtyStateTimer = 0;
  private simulationAccumulator = 0;
  private configurationRevision = 0;
  private viewSnapshot!: GameViewSnapshot;
  private readonly towerRandom: () => number;
  private readonly moduleInventory = new Map<ModuleId, number>();
  private readonly signalIndex = new SignalSpatialIndex();
  private readonly spaceRiftByKey = new Map<string, SpaceRift>();
  private readonly spaceRiftCoverage = new Map<Signal, SpaceRift>();
  private readonly spaceRiftCrossings = new Map<Signal, Point>();
  private readonly spaceRiftEnemies = new Map<number, Signal>();
  private readonly routeCache = new Map<NodeId, PathSampler>();
  private readonly spatialCandidates: Signal[] = [];
  private readonly nearbyCandidates: Signal[] = [];
  private readonly movementStart: Point = { x: 0, y: 0 };
  private readonly movementEnd: Point = { x: 0, y: 0 };
  private towerAuraCooldown = 1;
  private towerAuraEnergyRegen = 1;
  private draft: GameSnapshot['draft'] = null;
  private previousDraftChoices = new Set<ModuleId>();
  private draftsWithoutRare = 0;
  private creativeSetup: CreativeSetup;
  private runId = createRunId();
  private runStartedAt = Date.now();
  private defenseCompleted = false;
  private readonly defenseArchiveFacts = new Set<DefenseArchiveFact>();
  private readonly waveOutcomes = new Map<number, Partial<Record<SignalVariantId, SignalOutcomeTally>>>();
  private readonly combatApi: ModuleCombatApi = {
    // Unsorted, non-allocating: consumers must not retain the returned array.
    nearbyEnemies: (position, radius, excludeIds = NO_EXCLUDED_ENEMY_IDS) => (
      this.signalIndex.collectWithinRadius(position, radius, this.nearbyCandidates, excludeIds)
    ),
    nearestSignal: (position, radius, excludeIds = NO_EXCLUDED_ENEMY_IDS) => (
      this.signalIndex.findNearestWithinRadius(position, radius, excludeIds)
    ),
    dealDamage: (signal, damage, color, source) => {
      const result = this.applyDamage(signal, Math.max(1, Math.round(damage)), color);
      if (source && result.healthDamage > 0) {
        this.refundProjectileEnergy(source, result.healthDamage);
        this.dispatchTargetEffect(source, signal, 'damage', result.healthDamage);
      }
      return result.healthDamage;
    },
    affectTarget: (signal, source, channel) => this.dispatchTargetEffect(source, signal, channel),
    applySlow: (signal, factor, duration) => {
      if (signal.dead || factor <= 0 || duration <= 0) return false;
      const enteredSlow = signal.slowFactor <= 0 || signal.slowTime <= 0;
      signal.slowFactor = Math.max(signal.slowFactor, factor);
      signal.slowTime = Math.max(signal.slowTime, duration);
      return enteredSlow;
    },
    applyStatus: (signal, status) => this.applyStatus(signal, status),
    retarget: (projectile, signal) => {
      const direction = normalize({
        x: signal.position.x - projectile.position.x,
        y: signal.position.y - projectile.position.y,
      });
      projectile.targetId = signal.id;
      projectile.velocity.x = direction.x * projectile.speed;
      projectile.velocity.y = direction.y * projectile.speed;
    },
    displace: (signal, distanceDelta) => this.displaceSignal(signal, distanceDelta),
    extendRift: (source, key, position, options) => this.extendSpaceRift(source, key, position, options),
  };

  constructor(options: GameEngineOptions | number = {}) {
    const normalized = typeof options === 'number' ? { seed: options } : options;
    this.mode = normalized.mode ?? 'creative';
    this.level = getLevel(normalized.levelId ?? DEFAULT_LEVEL_ID);
    this.tutorialEnabled = this.mode === 'standard' && this.level.id === TUTORIAL_LEVEL_ID;
    this.difficulty = getDifficulty(normalized.difficultyId ?? DEFAULT_DIFFICULTY_ID);
    const firstEntrance = this.level.graph.entrances[0];
    if (!firstEntrance) throw new Error(`Level ${this.level.id} requires an entrance`);
    this.path = this.routeFor(firstEntrance);
    this.maxWaves = this.mode === 'creative'
      ? normalizeCreativeWaveCount(normalized.creative?.waveCount ?? this.level.waves.length)
      : this.level.waves.length;
    this.maxCore = this.mode === 'creative'
      ? normalizeCreativeCoreStability(normalized.creative?.coreStability ?? 20)
      : 20;
    this.core = this.maxCore;
    this.shards = this.mode === 'creative'
      ? Number.POSITIVE_INFINITY
      : Math.round(this.level.startingShards * this.difficulty.economy);
    this.creativeSetup = {
      healthScale: Math.max(0.25, Math.min(5, normalized.creative?.healthScale ?? 1)),
      speedScale: Math.max(0.25, Math.min(3, normalized.creative?.speedScale ?? 1)),
      coreStability: this.maxCore,
      waveCount: this.maxWaves,
    };
    this.towerRandom = createSeededRandom(normalized.seed ?? Math.floor(Math.random() * 0x1_0000_0000));
    this.effects.registerMany(gameEffects);
    this.modules.registerEffects(this.effects);
    if (this.tutorialEnabled) {
      for (const [moduleId, count] of Object.entries(TUTORIAL_MODULES)) this.moduleInventory.set(moduleId, count);
    } else if (this.mode === 'standard') {
      this.moduleInventory.set('pulse', 3);
      this.moduleInventory.set('frost', 2);
    }
    const first = this.buildTower(0);
    if (this.tutorialEnabled) {
      first.slots = Array.from({ length: 4 }, () => null);
    } else {
      first.slots[0] = 'frost';
      first.slots[1] = 'pulse';
    }
    this.towers.push(first);
    this.selectedTowerId = null;
    if (this.mode === 'standard' && !this.tutorialEnabled) {
      this.beginModuleDraft(this.level.moduleDraft.initialPicks);
    }
    this.refreshViewSnapshot();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeView = (listener: ViewListener): (() => void) => {
    this.viewListeners.add(listener);
    return () => this.viewListeners.delete(listener);
  };

  getViewSnapshot = (): GameViewSnapshot => this.viewSnapshot;

  getSplitRifts(): readonly SplitRift[] {
    return this.pendingSignalSplits;
  }

  private emit(event: GameEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private emitDefenseArchiveFact(fact: DefenseArchiveFact): void {
    if (this.defenseArchiveFacts.has(fact)) return;
    this.defenseArchiveFacts.add(fact);
    this.emit({ type: 'defense-archive-fact', fact });
  }

  private signalVariant(signal: Pick<Signal, 'variantId'>): SignalVariantId {
    return signal.variantId;
  }

  private outcomeFor(wave: number, variant: SignalVariantId): SignalOutcomeTally {
    let outcomes = this.waveOutcomes.get(wave);
    if (!outcomes) {
      outcomes = {};
      this.waveOutcomes.set(wave, outcomes);
    }
    const existing = outcomes[variant];
    if (existing) return existing;
    const created = emptySignalTally();
    outcomes[variant] = created;
    return created;
  }

  private inspectTowerAchievements(tower: Tower): void {
    const definitions = tower.slots
      .filter((moduleId): moduleId is ModuleId => moduleId !== null)
      .map((moduleId) => this.modules.get(moduleId))
      .filter((definition) => definition !== undefined);
    const program = this.modules.compile(tower.slots);
    if (program.shots.length > 0 && program.wraps > 0) this.emitDefenseArchiveFact('wrapped-program-configured');
    if (
      tower.slots.length >= 5
      && definitions.length === tower.slots.length
      && definitions.every((definition) => definition.meta.rarity === 'legendary')
    ) this.emitDefenseArchiveFact('legendary-tower-configured');
    if (new Set(definitions.map((definition) => definition.kind)).size === 5) {
      this.emitDefenseArchiveFact('five-kinds-configured');
    }
  }

  private completedDefenseReport(): DefenseCompletedReport {
    const waves = new Map<number, Partial<Record<SignalVariantId, SignalOutcomeTally>>>();
    for (const [wave, outcomes] of this.waveOutcomes) {
      waves.set(wave, Object.fromEntries(Object.entries(outcomes).map(([variant, tally]) => [
        variant,
        { ...tally! },
      ])) as Partial<Record<SignalVariantId, SignalOutcomeTally>>);
    }
    for (const signal of this.signals) {
      if (!signal.dead) this.outcomeForReport(waves, this.wave, this.signalVariant(signal)).remaining += 1;
    }
    for (const lane of this.spawnLanes) {
      for (const type of lane.queue) this.outcomeForReport(waves, this.wave, type).queued += 1;
    }
    const waveReports: DefenseWaveReport[] = [...waves.entries()]
      .sort(([left], [right]) => left - right)
      .map(([wave, signals]) => ({ wave, signals }));
    return {
      runId: this.runId,
      startedAt: this.runStartedAt,
      endedAt: Date.now(),
      simulationSeconds: this.combatElapsed,
      result: this.status === 'won' ? 'won' : 'lost',
      mode: this.mode,
      tutorial: this.tutorialEnabled,
      levelId: this.level.id,
      difficultyId: this.difficulty.id,
      waveReached: this.wave,
      maxWaves: this.maxWaves,
      score: this.score,
      core: this.core,
      maxCore: this.maxCore,
      shards: this.shards,
      waves: waveReports,
      inventory: this.modules.list()
        .map((definition) => ({ moduleId: definition.id, count: this.getModuleCount(definition.id) }))
        .filter((entry) => entry.count > 0),
      towers: this.towers.map((tower) => ({
        padIndex: tower.padIndex,
        level: tower.level,
        targeting: tower.targeting,
        slots: [...tower.slots],
      })),
    };
  }

  private outcomeForReport(
    waves: Map<number, Partial<Record<SignalVariantId, SignalOutcomeTally>>>,
    wave: number,
    variant: SignalVariantId,
  ): SignalOutcomeTally {
    let outcomes = waves.get(wave);
    if (!outcomes) {
      outcomes = {};
      waves.set(wave, outcomes);
    }
    const existing = outcomes[variant];
    if (existing) return existing;
    const created = emptySignalTally();
    outcomes[variant] = created;
    return created;
  }

  private completeDefense(): void {
    if (this.defenseCompleted || (this.status !== 'won' && this.status !== 'lost')) return;
    this.defenseCompleted = true;
    this.emit({ type: 'defense-completed', report: this.completedDefenseReport() });
  }

  getSnapshot(): GameSnapshot {
    return this.viewSnapshot?.game ?? this.createGameSnapshot();
  }

  private countWaveSignals(): Readonly<Partial<Record<SignalId, number>>> {
    const counts: Partial<Record<SignalId, number>> = {};
    const increment = (type: SignalId): void => {
      counts[type] = (counts[type] ?? 0) + 1;
    };
    for (const lane of this.spawnLanes) {
      for (const type of lane.queue) increment(type);
    }
    for (const signal of this.signals) {
      if (!signal.dead) increment(signal.type);
    }
    for (const split of this.pendingSignalSplits) {
      if (!split.spawned) increment(split.parent.type);
    }
    return Object.freeze(counts);
  }

  private createGameSnapshot(): GameSnapshot {
    return {
      status: this.status,
      mode: this.mode,
      levelId: this.level.id,
      levelName: this.level.name,
      wave: this.wave,
      maxWaves: this.maxWaves,
      core: this.core,
      maxCore: this.maxCore,
      shards: this.shards,
      score: this.score,
      signalsAlive: this.signals.filter((signal) => !signal.dead).length
        + this.pendingSignalSplits.filter((split) => !split.spawned).length,
      waveQueue: this.spawnLanes.reduce((total, lane) => total + lane.queue.length, 0),
      waveSignalCounts: this.countWaveSignals(),
      selectedTowerId: this.selectedTowerId,
      speed: this.speed,
      paused: this.paused,
      draft: this.draft ? { ...this.draft, choices: [...this.draft.choices] } : null,
    };
  }

  private emitState(): void {
    this.refreshViewSnapshot();
    this.emit({ type: 'state', snapshot: this.viewSnapshot.game });
    this.viewListeners.forEach((listener) => listener());
  }

  private cloneTower(tower: Tower): Tower {
    return Object.freeze({
      ...tower,
      position: Object.freeze({ ...tower.position }),
      slots: Object.freeze([...tower.slots]) as Array<ModuleId | null>,
    });
  }

  private refreshViewSnapshot(): void {
    const selected = this.getSelectedTower();
    const towers = this.towers.map((tower) => this.cloneTower(tower));
    const moduleInventory = Object.fromEntries(this.modules.list().map((definition) => [
      definition.id,
      Object.freeze({
        total: this.getModuleCount(definition.id),
        installed: this.getInstalledModuleCount(definition.id),
        available: this.getAvailableModuleCount(definition.id),
      }),
    ]));
    const game = Object.freeze(this.createGameSnapshot());
    this.viewSnapshot = Object.freeze({
      revision: this.configurationRevision,
      game,
      towers: Object.freeze(towers),
      selectedTower: selected ? towers.find((tower) => tower.id === selected.id) ?? null : null,
      selectedProgram: selected ? this.modules.compile(selected.slots) : null,
      creativeSetup: Object.freeze({
        ...this.creativeSetup,
      }) as CreativeSetup,
      moduleInventory: Object.freeze(moduleInventory),
    });
  }

  private markConfigurationChanged(): void {
    this.configurationRevision += 1;
  }

  private buildTower(padIndex: number): Tower {
    const pad = this.level.towerPads[padIndex];
    if (!pad) throw new RangeError(`Invalid tower pad index: ${padIndex}`);
    const stats = rollTowerStats(this.towerRandom);
    return {
      id: this.nextId++,
      padIndex,
      position: { ...pad },
      rotation: -Math.PI / 2,
      energy: stats.maxEnergy,
      maxEnergy: stats.maxEnergy,
      energyRegen: stats.energyRegen,
      cooldown: stats.cooldown,
      cooldownLeft: 0,
      range: stats.range,
      targeting: 'core-nearest',
      level: 1,
      slots: Array.from({ length: stats.slotCount }, () => null),
      flash: 0,
      targetId: null,
    };
  }

  getSelectedTower(): Tower | null {
    return this.towers.find((tower) => tower.id === this.selectedTowerId) ?? null;
  }

  getTowerColor(tower: Tower): string {
    return TOWER_COLORS[tower.id % TOWER_COLORS.length] ?? TOWER_COLORS[0] ?? '#6c5ce7';
  }

  getWaveBlueprint(index: number): readonly SpawnEntry[] {
    return this.level.waves[Math.min(Math.max(0, index), this.level.waves.length - 1)] ?? [];
  }

  routeFor(routeId: NodeId): PathSampler {
    const cached = this.routeCache.get(routeId);
    if (cached) return cached;
    const route = resolveRoute(this.level.graph, routeId);
    this.routeCache.set(routeId, route);
    return route;
  }

  routeForSignal(signal: Signal): PathSampler {
    return this.routeFor(signal.routeId);
  }

  distanceToCore(signal: Signal): number {
    return Math.max(0, this.routeForSignal(signal).length - signal.distance);
  }

  getCorePosition(): Point {
    const root = this.level.graph.nodes.get(this.level.graph.root);
    if (!root) throw new Error(`Level ${this.level.id} has no root node`);
    return root.position;
  }

  private centerlineIntersectionTime(start: Point, end: Point): number | null {
    let first: number | null = null;
    for (const entrance of this.level.graph.entrances) {
      const time = this.routeFor(entrance).centerlineIntersectionTime(start, end);
      if (time !== null && (first === null || time < first)) first = time;
    }
    return first;
  }

  getModuleCount(moduleId: ModuleId): number {
    return this.mode === 'creative' ? Number.POSITIVE_INFINITY : this.moduleInventory.get(moduleId) ?? 0;
  }

  getInstalledModuleCount(moduleId: ModuleId): number {
    return this.towers.reduce(
      (sum, tower) => sum + tower.slots.filter((installed) => installed === moduleId).length,
      0,
    );
  }

  getAvailableModuleCount(moduleId: ModuleId): number {
    if (this.mode === 'creative') return Number.POSITIVE_INFINITY;
    return Math.max(0, this.getModuleCount(moduleId) - this.getInstalledModuleCount(moduleId));
  }

  getLibraryModules() {
    const definitions = this.modules.list();
    return this.mode === 'creative'
      ? definitions.sort((left, right) => (
        CREATIVE_KIND_ORDER[left.kind] - CREATIVE_KIND_ORDER[right.kind]
        || CREATIVE_RARITY_ORDER[left.meta.rarity] - CREATIVE_RARITY_ORDER[right.meta.rarity]
      ))
      : definitions
        .filter((definition) => this.getModuleCount(definition.id) > 0)
        .sort((left, right) => (
          Number(this.getAvailableModuleCount(left.id) === 0)
          - Number(this.getAvailableModuleCount(right.id) === 0)
        ));
  }

  setTargeting(mode: TargetingMode): void {
    const tower = this.getSelectedTower();
    if (!tower) return;
    const changed = tower.targeting !== mode;
    tower.targeting = mode;
    if (changed && mode !== 'core-nearest') this.emitDefenseArchiveFact('targeting-mode-configured');
    this.markConfigurationChanged();
    this.emitState();
  }

  getTowerUpgradeCost(tower: Tower): number {
    return tower.level >= MAX_TOWER_LEVEL ? 0 : ECONOMY_BALANCE.upgradeCosts[tower.level] ?? 0;
  }

  upgradeSelectedTower(): void {
    const tower = this.getSelectedTower();
    if (!tower || this.status === 'wave') return;
    if (tower.level >= MAX_TOWER_LEVEL) {
      this.emit({ type: 'toast', message: i18n.t('toast.maxLevel'), tone: 'info' });
      return;
    }
    const cost = this.getTowerUpgradeCost(tower);
    if (this.shards < cost) {
      this.emit({ type: 'toast', message: i18n.t('toast.upgradeNeeds', { cost }), tone: 'warn' });
      return;
    }
    this.shards -= cost;
    tower.level += 1;
    tower.maxEnergy += 16;
    tower.energy += 16;
    tower.energyRegen = Math.round((tower.energyRegen + 1.3) * 10) / 10;
    tower.cooldown = Math.max(0.55, Math.round(tower.cooldown * 0.96 * 100) / 100);
    tower.range += 10;
    if (tower.level === 3 || tower.level === 5) tower.slots.push(null);
    if (tower.level === MAX_TOWER_LEVEL) this.emitDefenseArchiveFact('tower-maxed');
    this.effects.spawnMany(['game:tower-build-ring', 'game:tower-build-sparks'], {
      position: tower.position,
      color: this.getTowerColor(tower),
      lifetimeScale: 1.25,
    });
    this.emit({ type: 'toast', message: i18n.t('toast.upgraded', { level: tower.level }), tone: 'good' });
    this.markConfigurationChanged();
    this.emitState();
  }

  getCreativeSetup(): CreativeSetup {
    return { ...this.creativeSetup };
  }

  configureCreativeScales(healthScale: number, speedScale: number): void {
    if (this.mode !== 'creative' || !Number.isFinite(healthScale) || !Number.isFinite(speedScale)) return;
    this.creativeSetup.healthScale = Math.max(0.25, Math.min(5, healthScale));
    this.creativeSetup.speedScale = Math.max(0.25, Math.min(3, speedScale));
    this.emitState();
  }

  spawnCreativeSignal(type: SignalId, requestedEntrance?: NodeId): void {
    if (this.mode !== 'creative' || this.status === 'won' || this.status === 'lost') return;
    const entrance = requestedEntrance ?? this.level.graph.entrances[0];
    if (!entrance) return;
    if (!this.level.graph.entrances.includes(entrance)) throw new Error(`Unknown route entrance: ${entrance}`);
    this.spawnSignal(type, entrance);
    this.emitDefenseArchiveFact('creative-signal-spawned');
    this.emitState();
  }

  chooseDraftModule(moduleId: ModuleId): void {
    if (this.status !== 'reward' || !this.draft?.choices.includes(moduleId)) return;
    this.moduleInventory.set(moduleId, (this.moduleInventory.get(moduleId) ?? 0) + 1);
    this.configurationRevision += 1;
    this.emit({ type: 'toast', message: i18n.t('toast.moduleAcquired', { module: i18n.t(`modules.${moduleId}.name`) }), tone: 'good' });
    if (this.draft.round >= this.draft.totalRounds) {
      this.draft = null;
      this.status = 'planning';
    } else {
      this.draft = {
        round: this.draft.round + 1,
        totalRounds: this.draft.totalRounds,
        choices: this.rollDraftChoices(),
      };
    }
    this.emitState();
  }

  setPointer(point: Point | null): void {
    this.pointer = point;
  }

  selectTower(id: number | null): void {
    if (id !== null && !this.towers.some((tower) => tower.id === id)) return;
    this.selectedTowerId = id;
    this.markConfigurationChanged();
    this.emitState();
  }

  handleWorldClick(point: Point): void {
    const tower = this.findTowerAt(point);
    if (tower) {
      this.selectTower(tower.id);
      return;
    }
    const padIndex = this.findPadAt(point);
    if (padIndex !== null) {
      this.placeTower(padIndex);
      return;
    }
    this.selectTower(null);
  }

  private findTowerAt(point: Point): Tower | null {
    return this.towers.find((tower) => distance(tower.position, point) < 35) ?? null;
  }

  private findPadAt(point: Point): number | null {
    const index = this.level.towerPads.findIndex((pad, padIndex) =>
      !this.towers.some((tower) => tower.padIndex === padIndex) && distance(pad, point) < 38,
    );
    return index >= 0 ? index : null;
  }

  placeTower(padIndex: number): void {
    if (!Number.isInteger(padIndex) || padIndex < 0 || padIndex >= this.level.towerPads.length) {
      this.emit({ type: 'toast', message: i18n.t('toast.invalidPad'), tone: 'warn' });
      return;
    }
    if (this.towers.some((tower) => tower.padIndex === padIndex)) return;
    if (this.shards < ECONOMY_BALANCE.towerCost) {
      this.emit({ type: 'toast', message: i18n.t('toast.buildNeeds', { cost: ECONOMY_BALANCE.towerCost }), tone: 'warn' });
      return;
    }
    this.shards -= ECONOMY_BALANCE.towerCost;
    const tower = this.buildTower(padIndex);
    this.towers.push(tower);
    this.selectedTowerId = tower.id;
    if (this.towers.length >= 2) this.emitDefenseArchiveFact('second-tower-built');
    const color = this.getTowerColor(tower);
    this.effects.spawnMany(['game:tower-build-ring', 'game:tower-build-sparks'], { position: tower.position, color });
    this.emit({
      type: 'toast',
      message: i18n.t('toast.built', { slots: tower.slots.length, energy: tower.maxEnergy }),
      tone: 'good',
    });
    this.markConfigurationChanged();
    this.emitState();
  }

  installModule(slotIndex: number, moduleId: ModuleId | null): void {
    const tower = this.getSelectedTower();
    if (!tower || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= tower.slots.length) return;
    if (moduleId && !this.modules.get(moduleId)) {
      this.emit({ type: 'toast', message: i18n.t('toast.unknownModule', { module: moduleId }), tone: 'warn' });
      return;
    }
    if (moduleId && this.mode === 'standard') {
      const installedElsewhere = this.towers.reduce((sum, item) => sum + item.slots.reduce(
        (slotSum, installed, index) => slotSum + (installed === moduleId && !(item.id === tower.id && index === slotIndex) ? 1 : 0),
        0,
      ), 0);
      if (installedElsewhere >= this.getModuleCount(moduleId)) {
        this.emit({ type: 'toast', message: i18n.t('toast.inventoryUsed'), tone: 'warn' });
        return;
      }
    }
    tower.slots[slotIndex] = moduleId;
    this.inspectTowerAchievements(tower);
    this.markConfigurationChanged();
    this.emitState();
  }

  swapModules(from: number, to: number): void {
    const tower = this.getSelectedTower();
    if (
      !tower
      || !Number.isInteger(from)
      || !Number.isInteger(to)
      || from < 0
      || to < 0
      || from >= tower.slots.length
      || to >= tower.slots.length
      || from === to
    ) return;
    const fromModule = tower.slots[from] ?? null;
    const toModule = tower.slots[to] ?? null;
    tower.slots[from] = toModule;
    tower.slots[to] = fromModule;
    if (fromModule !== toModule) this.emitDefenseArchiveFact('module-order-changed');
    this.inspectTowerAchievements(tower);
    this.markConfigurationChanged();
    this.emitState();
  }

  clearLoadout(): void {
    const tower = this.getSelectedTower();
    if (!tower) return;
    tower.slots.fill(null);
    this.markConfigurationChanged();
    this.emitState();
  }

  startWave(): void {
    if (this.status !== 'planning') return;
    if (this.wave >= this.maxWaves) return;
    this.wave += 1;
    this.status = 'wave';
    this.waveClearDelayLeft = null;
    this.spawnLanes = this.level.graph.entrances.map((entrance) => ({
      entrance,
      queue: [],
      timer: 0.25,
    }));
    const lanesByEntrance = new Map(this.spawnLanes.map((lane) => [lane.entrance, lane]));
    for (const entry of this.getWaveBlueprint(this.wave - 1)) {
      for (const entrance of resolveSpawnEntrances(entry, this.level.graph)) {
        lanesByEntrance.get(entrance)?.queue.push(entry.type);
      }
    }
    this.emit({ type: 'toast', message: i18n.t('toast.waveStarted', { wave: this.wave, maxWaves: this.maxWaves }), tone: 'info' });
    this.emitState();
  }

  togglePause(): void {
    this.paused = !this.paused;
    this.emitState();
  }

  setSpeed(speed: number): void {
    if (speed !== 1 && speed !== 2) return;
    this.speed = speed;
    this.emitState();
  }

  reset(): void {
    this.towers.length = 0;
    this.signals.length = 0;
    this.signalIndex.clear();
    this.projectiles.length = 0;
    this.spaceRifts.length = 0;
    this.spaceRiftByKey.clear();
    this.effects.clear();
    this.floatingTexts.length = 0;
    this.scheduledCasts.length = 0;
    this.pendingSignalSplits.length = 0;
    this.spawnLanes.length = 0;
    this.waveClearDelayLeft = null;
    this.status = 'planning';
    this.wave = 0;
    this.core = this.maxCore;
    this.shards = this.mode === 'creative'
      ? Number.POSITIVE_INFINITY
      : Math.round(this.level.startingShards * this.difficulty.economy);
    this.score = 0;
    this.elapsed = 0;
    this.combatElapsed = 0;
    this.visualElapsed = 0;
    this.simulationAccumulator = 0;
    this.paused = false;
    this.runId = createRunId();
    this.runStartedAt = Date.now();
    this.defenseCompleted = false;
    this.defenseArchiveFacts.clear();
    this.waveOutcomes.clear();
    this.draft = null;
    this.previousDraftChoices.clear();
    this.draftsWithoutRare = 0;
    this.moduleInventory.clear();
    if (this.tutorialEnabled) {
      for (const [moduleId, count] of Object.entries(TUTORIAL_MODULES)) this.moduleInventory.set(moduleId, count);
    } else if (this.mode === 'standard') {
      this.moduleInventory.set('pulse', 3);
      this.moduleInventory.set('frost', 2);
    }
    const first = this.buildTower(0);
    if (this.tutorialEnabled) {
      first.slots = Array.from({ length: 4 }, () => null);
    } else {
      first.slots[0] = 'frost';
      first.slots[1] = 'pulse';
    }
    this.towers.push(first);
    this.selectedTowerId = null;
    if (this.mode === 'standard' && !this.tutorialEnabled) {
      this.beginModuleDraft(this.level.moduleDraft.initialPicks);
    }
    this.markConfigurationChanged();
    this.emitState();
  }

  update(realDelta: number): void {
    const frameDelta = Math.min(Math.max(0, realDelta), MAX_FRAME_DELTA);
    this.visualElapsed += frameDelta;
    if (this.paused || this.status === 'won' || this.status === 'lost') return;
    this.simulationAccumulator += frameDelta * this.speed;
    let steps = 0;
    while (this.simulationAccumulator + Number.EPSILON >= FIXED_SIMULATION_STEP && steps < MAX_SIMULATION_STEPS) {
      this.simulationAccumulator -= FIXED_SIMULATION_STEP;
      this.stepSimulation(FIXED_SIMULATION_STEP);
      steps += 1;
    }
    if (steps >= MAX_SIMULATION_STEPS) {
      this.simulationAccumulator = Math.min(this.simulationAccumulator, FIXED_SIMULATION_STEP);
    }
  }

  private stepSimulation(delta: number): void {
    const combatActive = this.status === 'wave';
    this.elapsed += delta;
    if (combatActive) this.combatElapsed += delta;
    this.updateVisuals(delta);
    this.effects.update(delta);

    this.spawnEnemies(delta);
    this.updateEnemies(delta);
    this.updatePendingSignalSplits(delta);
    this.updateTowers(delta);
    this.updateScheduledCasts(delta);
    this.updateProjectiles(delta);
    this.updateSpaceRifts(delta);
    this.cleanEntities();
    this.checkWaveEnd(delta);

    this.dirtyStateTimer -= delta;
    if (this.dirtyStateTimer <= 0) {
      this.dirtyStateTimer = 0.12;
      this.emitState();
    }
  }

  private spawnEnemies(delta: number): void {
    for (const lane of this.spawnLanes) {
      if (lane.queue.length === 0) continue;
      lane.timer -= delta;
      if (lane.timer > 0) continue;
      const type = lane.queue.shift();
      if (!type) continue;
      this.spawnSignal(type, lane.entrance);
      lane.timer = signalRegistry.require(type).stats.spawnDelay;
    }
  }

  private spawnSignal(type: SignalId, routeId: NodeId): void {
    const definition = signalRegistry.require(type);
    const stats = definition.stats;
    const shield = getSignalCapability(definition, 'shield');
    const creativeHealthScale = this.mode === 'creative' ? this.creativeSetup.healthScale : 1;
    const creativeSpeedScale = this.mode === 'creative' ? this.creativeSetup.speedScale : 1;
    const scale = Math.pow(COMBAT_BALANCE.waveHealthGrowth, Math.max(0, this.wave - 1))
      * this.level.signalHealthScale
      * this.difficulty.signalHealth
      * creativeHealthScale;
    const route = this.routeFor(routeId);
    const at = route.pointAtDistance(0);
    const signal: Signal = {
      id: this.nextId++,
      type,
      variantId: type,
      routeId,
      progress: 0,
      distance: 0,
      position: at.position,
      angle: at.angle,
      hp: Math.round(stats.health * scale),
      maxHp: Math.round(stats.health * scale),
      speed: stats.speed * this.level.signalSpeedScale * this.difficulty.signalSpeed * creativeSpeedScale,
      movementPhase: 0,
      reward: Math.max(1, Math.round(stats.reward * this.difficulty.economy)),
      coreDamage: stats.coreDamage,
      radius: stats.radius,
      slowFactor: 0,
      slowTime: 0,
      hitFlash: 0,
      ...createSignalShield(shield, scale),
      statuses: [],
      dead: false,
    };
    this.signals.push(signal);
    this.outcomeFor(this.wave, this.signalVariant(signal)).spawned += 1;
    this.signalIndex.update(signal);
  }

  private updateEnemies(delta: number): void {
    let lostThisStep = false;
    for (const signal of this.signals) {
      if (signal.dead) {
        this.signalIndex.remove(signal.id);
        continue;
      }
      const definition = signalRegistry.require(signal.type);
      const shieldConfig = getSignalCapability(definition, 'shield');
      const shieldRestored = updateSignalShield(signal, shieldConfig, delta);
      if (shieldRestored && shieldConfig) {
        signal.shieldRippleAge = 0;
        this.effects.spawn(GAME_EFFECT_IDS.shieldRestore, {
          position: signal.position,
          rotation: shieldConfig.rotation,
          color: shieldConfig.color,
          data: { radius: shieldConfig.radius, sides: shieldConfig.sides },
        });
      }
      this.updateSignalStatuses(signal, delta);
      if (signal.dead) {
        this.signalIndex.remove(signal.id);
        continue;
      }
      signal.slowTime = Math.max(0, signal.slowTime - delta);
      if (signal.slowTime <= 0) signal.slowFactor = 0;
      const movementPhase = signal.movementPhase ?? 0;
      const movement = getSignalCapability(definition, 'pulse-movement');
      const movementMultiplier = signalMovementSpeedMultiplier(movement, movementPhase);
      signal.movementPhase = movement
        ? (movementPhase + delta) % movement.cycle
        : 0;
      const speed = signal.speed * movementMultiplier * (1 - signal.slowFactor);
      signal.distance += speed * delta;
      const route = this.routeForSignal(signal);
      signal.progress = signal.distance / route.length;
      signal.angle = route.sampleInto(signal.distance, signal.position);
      if (signal.distance >= route.length) {
        signal.dead = true;
        const damage = signal.coreDamage;
        const outcome = this.outcomeFor(this.wave, this.signalVariant(signal));
        outcome.leaked += 1;
        outcome.coreDamage += damage;
        this.core = Math.max(0, this.core - damage);
        this.effects.spawn('game:core-hit', {
          position: this.getCorePosition(),
          color: '#ff5c5c',
        });
        this.emit({ type: 'toast', message: i18n.t('toast.coreDamaged', { damage }), tone: 'warn' });
        if (this.core <= 0) {
          this.status = 'lost';
          lostThisStep = true;
        }
      }
      this.signalIndex.update(signal);
    }
    if (lostThisStep) {
      this.completeDefense();
      this.emitState();
    }
  }

  private updateTowers(delta: number): void {
    for (const tower of this.towers) {
      this.updateTowerAuraModifiers(tower);
      tower.energy = Math.min(
        tower.maxEnergy,
        tower.energy + tower.energyRegen * this.towerAuraEnergyRegen * delta,
      );
      tower.cooldownLeft = Math.max(0, tower.cooldownLeft - delta / this.towerAuraCooldown);
      tower.flash = Math.max(0, tower.flash - delta * 5);

      const target = this.findTarget(tower);
      tower.targetId = target?.id ?? null;
      if (target) {
        const desired = angleBetween(tower.position, target.position);
        const diff = ((desired - tower.rotation + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        tower.rotation += diff * Math.min(1, delta * 11);
      }

      if (!target || tower.cooldownLeft > 0) continue;
      const program = this.modules.compile(tower.slots);
      if (program.shots.length === 0 || tower.energy < program.energyCost) continue;
      tower.energy -= program.energyCost;
      tower.cooldownLeft = tower.cooldown;
      tower.flash = 1;

      program.shots.forEach((shot, shotIndex) => {
        for (let repeat = 0; repeat < shot.repeats; repeat += 1) {
          const delay = shotIndex * 0.05 + repeat * shot.repeatDelay;
          if (delay <= 0) this.castShot(tower, shot, target);
          else this.scheduledCasts.push({ towerId: tower.id, blueprint: shot, targetId: target.id, delay });
        }
      });
    }
  }

  private updateTowerAuraModifiers(tower: Tower): void {
    let cooldown = 1;
    let energyRegen = 1;
    for (const signal of this.signals) {
      if (signal.dead) continue;
      const aura = getSignalCapability(signalRegistry.require(signal.type), 'tower-suppression-aura');
      if (!aura || distance(tower.position, signal.position) > aura.radius) continue;
      cooldown = Math.max(cooldown, aura.cooldownMultiplier);
      energyRegen = Math.min(energyRegen, aura.energyRegenMultiplier);
    }
    this.towerAuraCooldown = cooldown;
    this.towerAuraEnergyRegen = energyRegen;
  }

  private findTarget(tower: Tower): Signal | null {
    const candidates = this.signalIndex.collectWithinRadius(
      tower.position,
      tower.range,
      this.spatialCandidates,
    );
    return selectTowerTarget(
      tower,
      candidates,
      (signal) => this.signalIndex.countWithinRadius(signal.position, 92),
      (signal) => this.distanceToCore(signal),
    );
  }

  private updateScheduledCasts(delta: number): void {
    for (const cast of this.scheduledCasts) {
      cast.delay -= delta;
      if (cast.delay > 0) continue;
      const tower = this.towers.find((item) => item.id === cast.towerId);
      const target = this.signals.find((item) => item.id === cast.targetId && !item.dead) ?? (tower ? this.findTarget(tower) : null);
      if (tower && (target || cast.blueprint.static)) this.castShot(tower, cast.blueprint, target, cast.origin);
      cast.delay = -999;
    }
    let aliveCount = 0;
    for (const cast of this.scheduledCasts) {
      if (cast.delay <= -100) continue;
      this.scheduledCasts[aliveCount] = cast;
      aliveCount += 1;
    }
    this.scheduledCasts.length = aliveCount;
  }

  private castShot(tower: Tower, blueprint: ShotBlueprint, target: Signal | null, origin?: Point): void {
    const isStatic = blueprint.static !== undefined;
    if (isStatic && origin === undefined) return;
    if (!isStatic && !target) return;
    const launchOrigin = origin ?? tower.position;
    const triggeredCast = origin !== undefined;
    if (blueprint.modules.some((moduleId) => this.modules.get(moduleId)?.kind === 'trail')) {
      this.emitDefenseArchiveFact('trail-module-fired');
    }
    const spawnDistance = triggeredCast ? 4 : 27;
    const interception = target && !isStatic && blueprint.aim !== 'direct'
      ? findPathInterception({
        origin: launchOrigin,
        path: this.routeForSignal(target),
        projectileSpeed: blueprint.speed,
        projectileLifetime: blueprint.lifetime,
        launchOffset: spawnDistance,
        targetDistance: target.distance,
        targetSpeed: target.speed,
        targetSlowFactor: target.slowFactor,
        targetSlowTime: target.slowTime,
      })
      : null;
    const aimPoint = interception?.position ?? target?.position;
    const baseAngle = aimPoint ? angleBetween(launchOrigin, aimPoint) : tower.rotation;
    const muzzleDistance = triggeredCast ? 3 : 30;
    const muzzlePosition = {
      x: launchOrigin.x + Math.cos(baseAngle) * muzzleDistance,
      y: launchOrigin.y + Math.sin(baseAngle) * muzzleDistance,
    };
    if (!isStatic) {
      this.modules.dispatch('onCast', blueprint.modules, {
        effects: this.effects,
        position: muzzlePosition,
        rotation: baseAngle,
        color: blueprint.color,
        shot: blueprint,
        tower,
        combat: this.combatApi,
      });
    }
    for (let index = 0; index < blueprint.count; index += 1) {
      const offset = (index - (blueprint.count - 1) / 2) * blueprint.spread;
      const direction = rotate({ x: 1, y: 0 }, baseAngle + offset);
      const projectile: Projectile = {
        id: this.nextId++,
        towerId: tower.id,
        position: isStatic ? { ...launchOrigin } : {
          x: launchOrigin.x + direction.x * spawnDistance,
          y: launchOrigin.y + direction.y * spawnDistance,
        },
        velocity: isStatic ? { x: 0, y: 0 } : { x: direction.x * blueprint.speed, y: direction.y * blueprint.speed },
        targetId: target?.id ?? null,
        damage: blueprint.damage,
        speed: blueprint.speed,
        radius: blueprint.size,
        color: blueprint.color,
        life: blueprint.static?.duration ?? blueprint.lifetime,
        pierce: blueprint.pierce,
        slow: blueprint.slow,
        splash: blueprint.splash,
        seeking: blueprint.seeking,
        modules: [...blueprint.modules],
        shot: blueprint,
        trailTimer: 0,
        moduleState: {},
        behavior: isStatic ? 'static' : 'linear',
        age: 0,
        triggered: false,
        triggerCooldown: 0,
        triggerCount: 0,
        trail: [],
      };
      this.projectiles.push(projectile);
      if (isStatic) {
        this.modules.dispatch('onDeploy', projectile.modules, {
          effects: this.effects,
          position: { ...projectile.position },
          rotation: baseAngle,
          color: projectile.color,
          shot: projectile.shot,
          tower,
          projectile,
          combat: this.combatApi,
        });
      }
    }
    if (!triggeredCast && target) tower.rotation = baseAngle;
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of this.projectiles) {
      if (projectile.life <= 0) continue;
      projectile.age += delta;
      projectile.life -= delta;

      if (
        projectile.shot.trigger?.type === 'timer' &&
        !projectile.triggered &&
        projectile.age >= (projectile.shot.trigger.delay ?? 0.5)
      ) {
        projectile.triggered = true;
        const target = this.findTriggerTarget(projectile.position);
        this.triggerProjectile(projectile, target);
      }

      if (projectile.behavior === 'static') {
        const config = projectile.shot.static;
        if (!config) {
          projectile.life = 0;
          continue;
        }
        projectile.triggerCooldown = Math.max(0, projectile.triggerCooldown - delta);
        if (projectile.age >= config.armTime && config.gravity) {
          const nearbyEnemies = this.signalIndex.collectWithinRadius(
            projectile.position,
            config.gravity.radius,
            this.spatialCandidates,
          );
          for (const signal of nearbyEnemies) {
            const fieldDistance = this.routeForSignal(signal).nearestDistance(projectile.position);
            const offset = fieldDistance - signal.distance;
            const displacement = Math.sign(offset) * Math.min(Math.abs(offset), config.gravity.pull * delta);
            this.combatApi.displace(signal, displacement);
          }
        }
        if (projectile.age >= config.armTime && projectile.triggerCooldown <= 0) {
          const target = this.signalIndex.findNearestWithinRadius(projectile.position, config.triggerRadius);
          if (target) {
            projectile.triggerCooldown = config.cooldown;
            projectile.triggerCount += 1;
            this.modules.dispatch('onTrigger', projectile.modules, {
              effects: this.effects,
              position: { ...projectile.position },
              rotation: angleBetween(projectile.position, target.position),
              color: projectile.color,
              shot: projectile.shot,
              projectile,
              triggerTarget: target,
              combat: this.combatApi,
            });
            if (projectile.triggerCount >= config.maxTriggers) projectile.life = 0;
          }
        }
        continue;
      }

      const trailPoint = projectile.trail.length >= 6 ? projectile.trail.pop() : undefined;
      if (trailPoint) {
        trailPoint.x = projectile.position.x;
        trailPoint.y = projectile.position.y;
        projectile.trail.unshift(trailPoint);
      } else projectile.trail.unshift({ ...projectile.position });

      if (projectile.shot.trajectory !== 'fixed' && projectile.seeking > 0) {
        const target = this.resolveSeekingTarget(projectile);
        if (target) {
          const desiredAngle = angleBetween(projectile.position, target.position);
          const currentAngle = Math.atan2(projectile.velocity.y, projectile.velocity.x);
          const angleDifference = ((desiredAngle - currentAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          const maxTurn = projectile.seeking * delta;
          const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDifference));
          projectile.velocity.x = Math.cos(nextAngle) * projectile.speed;
          projectile.velocity.y = Math.sin(nextAngle) * projectile.speed;
        }
      }

      const movementStart = this.movementStart;
      const movementEnd = this.movementEnd;
      movementStart.x = projectile.position.x;
      movementStart.y = projectile.position.y;
      movementEnd.x = movementStart.x + projectile.velocity.x * delta;
      movementEnd.y = movementStart.y + projectile.velocity.y * delta;
      let reachedWorldBoundary = false;
      if (
        projectile.shot.boundary === 'world' &&
        (movementEnd.x < 0 || movementEnd.x > WORLD.width || movementEnd.y < 0 || movementEnd.y > WORLD.height)
      ) {
        let exitTime = 1;
        const dx = movementEnd.x - movementStart.x;
        const dy = movementEnd.y - movementStart.y;
        if (dx < 0) exitTime = Math.min(exitTime, (0 - movementStart.x) / dx);
        else if (dx > 0) exitTime = Math.min(exitTime, (WORLD.width - movementStart.x) / dx);
        if (dy < 0) exitTime = Math.min(exitTime, (0 - movementStart.y) / dy);
        else if (dy > 0) exitTime = Math.min(exitTime, (WORLD.height - movementStart.y) / dy);
        movementEnd.x = movementStart.x + dx * Math.max(0, exitTime);
        movementEnd.y = movementStart.y + dy * Math.max(0, exitTime);
        reachedWorldBoundary = true;
      }
      projectile.position.x = movementEnd.x;
      projectile.position.y = movementEnd.y;
      if (reachedWorldBoundary) projectile.trailTimer = 0;
      projectile.trailTimer -= delta;
      if (projectile.trailTimer <= 0) {
        projectile.trailTimer = 0.065;
        this.modules.dispatch('onTrail', projectile.modules, {
          effects: this.effects,
          position: { ...projectile.position },
          rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
          color: projectile.color,
          shot: projectile.shot,
          projectile,
          combat: this.combatApi,
        });
      }

      const hit = projectile.shot.collision !== 'none'
        ? this.findFirstProjectileHit(projectile, movementStart, movementEnd)
        : null;
      if (hit) {
        projectile.position.x = movementStart.x + (movementEnd.x - movementStart.x) * hit.time;
        projectile.position.y = movementStart.y + (movementEnd.y - movementStart.y) * hit.time;
        this.hitSignal(projectile, hit.signal);
      }

      if (projectile.shot.trigger?.type === 'terrain' && !projectile.triggered) {
        const moved = distance(movementStart, projectile.position) > SIMULATION_TIME_EPSILON;
        const delayedTicks = projectile.moduleState[TERRAIN_TRIGGER_CROSSING_TICKS] as number | undefined;
        const crossingTime = this.centerlineIntersectionTime(movementStart, projectile.position);
        const configuredTicks = Math.max(1, Math.round(projectile.shot.trigger.crossingTicks ?? 1));
        const crossedWithinTick = crossingTime !== null &&
          crossingTime > SIMULATION_TIME_EPSILON &&
          crossingTime < 1 - SIMULATION_TIME_EPSILON;
        if (moved && (delayedTicks !== undefined ? delayedTicks <= 1 : crossedWithinTick && configuredTicks <= 1)) {
          projectile.triggered = true;
          delete projectile.moduleState[TERRAIN_TRIGGER_CROSSING_TICKS];
          this.triggerProjectile(projectile, hit?.signal ?? this.findTriggerTarget(projectile.position));
        } else if (moved && delayedTicks !== undefined) {
          projectile.moduleState[TERRAIN_TRIGGER_CROSSING_TICKS] = delayedTicks - 1;
        } else if (crossedWithinTick) {
          projectile.moduleState[TERRAIN_TRIGGER_CROSSING_TICKS] = configuredTicks - 1;
        } else if (crossingTime !== null && crossingTime >= 1 - SIMULATION_TIME_EPSILON) {
          projectile.moduleState[TERRAIN_TRIGGER_CROSSING_TICKS] = configuredTicks;
        }
      }

      const outsideWorld = reachedWorldBoundary || (
        projectile.position.x < -60 || projectile.position.x > WORLD.width + 60 ||
        projectile.position.y < -60 || projectile.position.y > WORLD.height + 60
      );
      if (outsideWorld) projectile.life = 0;
      if (
        projectile.shot.trigger?.type === 'expiration' &&
        !projectile.triggered &&
        projectile.life <= 0 &&
        !outsideWorld
      ) {
        projectile.triggered = true;
        this.triggerProjectile(projectile, hit?.signal ?? this.findTriggerTarget(projectile.position));
      }
    }
  }

  private extendSpaceRift(
    source: Projectile,
    localKey: string,
    position: Point,
    options: Parameters<ModuleCombatApi['extendRift']>[3],
  ): void {
    const key = `${source.id}:${localKey}`;
    let rift = this.spaceRiftByKey.get(key);
    if (!rift) {
      const start = source.trail[0] ?? source.position;
      rift = {
        id: this.nextId++,
        key,
        points: [this.offsetRiftPoint(source, start, options.jitter ?? 0, 0)],
        width: options.width,
        damagePerSecond: options.damagePerSecond,
        settlementInterval: Math.max(FIXED_SIMULATION_STEP, options.settlementInterval),
        modifierInterval: Math.max(FIXED_SIMULATION_STEP, options.modifierInterval),
        effectInterval: Math.max(FIXED_SIMULATION_STEP, options.effectInterval),
        color: options.color,
        source,
        contacts: new Map(),
        remaining: options.duration,
        duration: options.duration,
        ...(options.hitEffectId ? { hitEffectId: options.hitEffectId } : {}),
      };
      this.spaceRifts.push(rift);
      this.spaceRiftByKey.set(key, rift);
    }
    rift.width = options.width;
    rift.damagePerSecond = options.damagePerSecond;
    rift.settlementInterval = Math.max(FIXED_SIMULATION_STEP, options.settlementInterval);
    rift.modifierInterval = Math.max(FIXED_SIMULATION_STEP, options.modifierInterval);
    rift.effectInterval = Math.max(FIXED_SIMULATION_STEP, options.effectInterval);
    rift.duration = options.duration;
    rift.remaining = options.duration;
    const nextPoint = this.offsetRiftPoint(source, position, options.jitter ?? 0, rift.points.length);
    const last = rift.points[rift.points.length - 1];
    if (last && Math.hypot(nextPoint.x - last.x, nextPoint.y - last.y) < 0.25) return;
    rift.points.push(nextPoint);
  }

  private offsetRiftPoint(source: Projectile, point: Point, jitter: number, index: number): Point {
    if (jitter <= 0) return { ...point };
    const velocityLength = Math.hypot(source.velocity.x, source.velocity.y) || 1;
    const normalX = -source.velocity.y / velocityLength;
    const normalY = source.velocity.x / velocityLength;
    const forwardX = source.velocity.x / velocityLength;
    const forwardY = source.velocity.y / velocityLength;
    const lateral = (seededNoise(source.id * 997 + index * 67) - 0.5) * jitter * 2;
    const longitudinal = (seededNoise(source.id * 613 + index * 43) - 0.5) * jitter * 0.35;
    return {
      x: point.x + normalX * lateral + forwardX * longitudinal,
      y: point.y + normalY * lateral + forwardY * longitudinal,
    };
  }

  private updateSpaceRifts(delta: number): void {
    if (this.spaceRifts.length === 0) {
      this.spaceRiftCoverage.clear();
      this.spaceRiftCrossings.clear();
      this.spaceRiftEnemies.clear();
      return;
    }
    this.spaceRiftEnemies.clear();
    for (const signal of this.signals) {
      if (!signal.dead) this.spaceRiftEnemies.set(signal.id, signal);
    }
    let aliveCount = 0;
    for (const rift of this.spaceRifts) {
      if (rift.source.life <= 0) rift.remaining -= delta;
      if (rift.remaining <= 0) {
        for (const [signalId, contact] of rift.contacts) {
          const signal = this.spaceRiftEnemies.get(signalId);
          if (signal) this.settleSpaceRiftContact(rift, signal, contact, true);
        }
        this.spaceRiftByKey.delete(rift.key);
        continue;
      }
      this.spaceRifts[aliveCount] = rift;
      aliveCount += 1;
    }
    this.spaceRifts.length = aliveCount;
    this.spaceRiftCoverage.clear();
    this.spaceRiftCrossings.clear();

    for (const signal of this.spaceRiftEnemies.values()) {
      for (const rift of this.spaceRifts) {
        if (rift.points.length < 2) continue;
        const coveredBy = this.spaceRiftCoverage.get(signal);
        if (coveredBy && coveredBy.damagePerSecond >= rift.damagePerSecond) continue;
        const crossing = this.findSpaceRiftCrossing(rift, signal);
        if (!crossing) continue;
        this.spaceRiftCoverage.set(signal, rift);
        this.spaceRiftCrossings.set(signal, crossing);
      }
    }

    for (const rift of this.spaceRifts) {
      const nextContacts = new Map<number, SpaceRiftContact>();
      for (const [signalId, previousContact] of rift.contacts) {
        const signal = this.spaceRiftEnemies.get(signalId);
        if (signal && this.spaceRiftCoverage.get(signal) !== rift) {
          this.settleSpaceRiftContact(rift, signal, previousContact, true);
        }
      }
      for (const [signal, coveredBy] of this.spaceRiftCoverage) {
        if (coveredBy !== rift || signal.dead) continue;
        const crossing = this.spaceRiftCrossings.get(signal);
        if (!crossing) continue;
        const contact = rift.contacts.get(signal.id) ?? {
          pendingDamage: 0,
          pendingDuration: 0,
          pendingModifierDamage: 0,
          settlementTimer: rift.settlementInterval,
          modifierTimer: 0,
          effectTimer: 0,
          lastPosition: crossing,
        };
        contact.lastPosition = crossing;
        contact.pendingDamage += rift.damagePerSecond * delta;
        contact.pendingDuration += delta;
        contact.settlementTimer -= delta;
        contact.modifierTimer -= delta;
        contact.effectTimer -= delta;
        if (contact.settlementTimer <= SIMULATION_TIME_EPSILON) {
          while (contact.settlementTimer <= SIMULATION_TIME_EPSILON) {
            contact.settlementTimer += rift.settlementInterval;
          }
          this.settleSpaceRiftContact(rift, signal, contact, false);
        }
        if (!signal.dead) nextContacts.set(signal.id, contact);
      }
      rift.contacts = nextContacts;
    }
  }

  private findSpaceRiftCrossing(rift: SpaceRift, signal: Signal): Point | null {
    const radius = signal.radius + rift.width * 0.5;
    const radiusSquared = radius * radius;
    for (let index = 1; index < rift.points.length; index += 1) {
      const start = rift.points[index - 1];
      const end = rift.points[index];
      if (!start || !end) continue;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const projection = lengthSquared <= Number.EPSILON ? 0 : Math.max(0, Math.min(1,
        ((signal.position.x - start.x) * dx + (signal.position.y - start.y) * dy) / lengthSquared,
      ));
      const x = start.x + dx * projection;
      const y = start.y + dy * projection;
      const offsetX = signal.position.x - x;
      const offsetY = signal.position.y - y;
      if (offsetX * offsetX + offsetY * offsetY <= radiusSquared) return { x, y };
    }
    return null;
  }

  private settleSpaceRiftContact(
    rift: SpaceRift,
    signal: Signal,
    contact: SpaceRiftContact,
    flushModifier: boolean,
  ): void {
    if (contact.pendingDamage > SIMULATION_TIME_EPSILON && contact.pendingDuration > 0) {
      const result = this.applyDamage(
        signal,
        contact.pendingDamage,
        rift.color,
        contact.pendingDuration,
      );
      contact.pendingDamage = 0;
      contact.pendingDuration = 0;
      if (result.healthDamage > 0) {
        this.refundProjectileEnergy(rift.source, result.healthDamage);
        contact.pendingModifierDamage += result.healthDamage;
        if (rift.hitEffectId && contact.effectTimer <= SIMULATION_TIME_EPSILON) {
          this.effects.spawn(rift.hitEffectId, {
            position: contact.lastPosition,
            color: rift.color,
          });
          while (contact.effectTimer <= SIMULATION_TIME_EPSILON) {
            contact.effectTimer += rift.effectInterval;
          }
        }
      }
    }
    if (
      contact.pendingModifierDamage > 0 &&
      (flushModifier || contact.modifierTimer <= SIMULATION_TIME_EPSILON)
    ) {
      this.dispatchTargetEffect(
        rift.source,
        signal,
        'damage',
        contact.pendingModifierDamage,
      );
      contact.pendingModifierDamage = 0;
      if (flushModifier) contact.modifierTimer = rift.modifierInterval;
      else {
        while (contact.modifierTimer <= SIMULATION_TIME_EPSILON) {
          contact.modifierTimer += rift.modifierInterval;
        }
      }
    }
  }

  private hitSignal(projectile: Projectile, signal: Signal): void {
    const damageDealt = this.combatApi.dealDamage(signal, projectile.damage, projectile.color, projectile);
    if (damageDealt <= 0) {
      projectile.life = 0;
      return;
    }
    this.modules.dispatch('onHit', projectile.modules, {
      effects: this.effects,
      position: { ...signal.position },
      rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
      color: projectile.color,
      shot: projectile.shot,
      projectile,
      signal,
      damageDealt,
      combat: this.combatApi,
    });
    if (
      (projectile.shot.trigger?.type === 'impact' || projectile.shot.trigger?.type === 'timer') &&
      !projectile.triggered
    ) {
      projectile.triggered = true;
      this.triggerProjectile(projectile, signal);
    }
    if (projectile.splash > 0) {
      const nearbyEnemies = this.signalIndex.collectWithinRadius(
        signal.position,
        projectile.splash,
        this.spatialCandidates,
        signal.id,
      );
      for (const nearby of nearbyEnemies) {
        this.combatApi.dealDamage(
          nearby,
          Math.round(projectile.damage * COMBAT_BALANCE.splashDamageFactor),
          projectile.color,
          projectile,
        );
      }
    }
    projectile.pierce -= 1;
    if (projectile.pierce < 0) projectile.life = 0;
    else {
      const exitDistance = (signal.radius + projectile.radius) * 2 + 2;
      const velocityLength = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1;
      projectile.position.x += projectile.velocity.x / velocityLength * exitDistance;
      projectile.position.y += projectile.velocity.y / velocityLength * exitDistance;
      if (projectile.seeking > 0) this.resolveSeekingTarget(projectile);
    }
  }

  private dispatchTargetEffect(
    projectile: Projectile,
    signal: Signal,
    channel: TargetEffectChannel,
    damageDealt?: number,
  ): void {
    const tower = this.towers.find((item) => item.id === projectile.towerId);
    this.modules.dispatchTargetEffect(channel, projectile.modules, {
      effects: this.effects,
      position: { ...signal.position },
      rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
      color: projectile.color,
      shot: projectile.shot,
      ...(tower ? { tower } : {}),
      projectile,
      signal,
      ...(damageDealt === undefined ? {} : { damageDealt }),
      targetEffectChannel: channel,
      combat: this.combatApi,
    });
  }

  private resolveSeekingTarget(projectile: Projectile): Signal | null {
    const current = this.signals.find((signal) => signal.id === projectile.targetId && !signal.dead);
    if (current) return current;

    const remainingRange = Math.max(0, projectile.speed * projectile.life);
    const target = this.signalIndex.findNearestWithinRadius(
      projectile.position,
      Math.min(SEEKING_RETARGET_RADIUS, remainingRange),
    );
    projectile.targetId = target?.id ?? null;
    if (target) this.combatApi.retarget(projectile, target);
    return target;
  }

  private findTriggerTarget(position: Point): Signal | null {
    const nearbyEnemies = this.signalIndex.collectWithinRadius(position, 280, this.spatialCandidates);
    let best: Signal | null = null;
    for (const signal of nearbyEnemies) {
      if (!best || this.distanceToCore(signal) < this.distanceToCore(best)) best = signal;
    }
    return best;
  }

  private findFirstProjectileHit(
    projectile: Projectile,
    start: Point,
    end: Point,
  ): { signal: Signal; time: number } | null {
    let first: { signal: Signal; time: number } | null = null;
    const candidates = this.signalIndex.collectAlongSegment(
      start,
      end,
      MAX_ENEMY_COLLISION_RADIUS + projectile.radius,
      this.spatialCandidates,
    );
    for (const signal of candidates) {
      const time = this.projectileHitTime(signal, projectile, start, end);
      if (time !== null && (!first || time < first.time)) first = { signal, time };
    }
    return first;
  }

  private projectileHitTime(signal: Signal, projectile: Projectile, start: Point, end: Point): number | null {
    const shield = getSignalCapability(signalRegistry.require(signal.type), 'shield');
    if (!shield || signal.shield <= 0) {
      return segmentCircleHitTime(start, end, signal.position, signal.radius + projectile.radius);
    }
    const shieldTime = segmentRegularPolygonHitTime(
      start,
      end,
      (point) => isInsideRegularShield(
        signal.position.x,
        signal.position.y,
        point.x,
        point.y,
        shield.radius * signal.shieldRadiusScale,
        shield.sides,
        shield.rotation,
        projectile.radius,
      ),
      projectile.radius,
    );
    const bodyTime = segmentCircleHitTime(start, end, signal.position, signal.radius + projectile.radius);
    if (shieldTime === null) return bodyTime;
    if (bodyTime === null) return shieldTime;
    return Math.min(shieldTime, bodyTime);
  }

  private triggerProjectile(projectile: Projectile, target: Signal | null): void {
    this.modules.dispatch('onTrigger', projectile.modules, {
      effects: this.effects,
      position: { ...projectile.position },
      rotation: target ? angleBetween(projectile.position, target.position) : Math.atan2(projectile.velocity.y, projectile.velocity.x),
      color: projectile.color,
      shot: projectile.shot,
      projectile,
      ...(target ? { triggerTarget: target } : {}),
      combat: this.combatApi,
    });
    this.firePayload(projectile, target);
  }

  private firePayload(projectile: Projectile, target: Signal | null): void {
    const tower = this.towers.find((item) => item.id === projectile.towerId);
    if (!tower) return;
    projectile.shot.payload.forEach((payload, payloadIndex) => {
      for (let repeat = 0; repeat < payload.repeats; repeat += 1) {
        const delay = payloadIndex * 0.04 + repeat * payload.repeatDelay;
        if (delay <= 0) this.castShot(tower, payload, target, projectile.position);
        else {
          if (!target && !payload.static) continue;
          this.scheduledCasts.push({
            towerId: tower.id,
            blueprint: payload,
            targetId: target?.id ?? -1,
            delay,
            origin: { ...projectile.position },
          });
        }
      }
    });
  }

  private refundProjectileEnergy(projectile: Projectile, damageDealt: number): void {
    if (damageDealt <= 0 || projectile.shot.energyRefundMultiplier <= 0) return;
    const tower = this.towers.find((item) => item.id === projectile.towerId);
    if (!tower) return;
    tower.energy = Math.min(
      tower.maxEnergy,
      tower.energy + damageDealt * projectile.shot.energyRefundMultiplier,
    );
  }

  private displaceSignal(signal: Signal, distanceDelta: number): void {
    if (signal.dead || !Number.isFinite(distanceDelta)) return;
    const route = this.routeForSignal(signal);
    signal.distance = Math.max(0, Math.min(route.length, signal.distance + distanceDelta));
    signal.progress = signal.distance / route.length;
    signal.angle = route.sampleInto(signal.distance, signal.position);
    this.signalIndex.update(signal);
  }

  private applyDamage(signal: Signal, damage: number, color: string, continuousDuration?: number) {
    if (signal.dead) return { absorbed: 0, healthDamage: 0, broke: false };
    const definition = signalRegistry.require(signal.type);
    const shieldConfig = getSignalCapability(definition, 'shield');
    const armor = getSignalCapability(definition, 'damage-cap');
    const shieldResult = absorbSignalShieldDamage(signal, damage * this.difficulty.towerDamage, shieldConfig);
    const result = {
      ...shieldResult,
      healthDamage: continuousDuration === undefined
        ? limitSignalHealthDamage(shieldResult.healthDamage, armor)
        : limitSignalContinuousHealthDamage(
          shieldResult.healthDamage,
          continuousDuration,
          armor,
        ),
    };
    signal.hitFlash = 1;
    if (result.absorbed > 0 && shieldConfig) {
      this.floatingTexts.push({
        position: {
          x: signal.position.x + (seededNoise(signal.id + this.elapsed) - 0.5) * 18,
          y: signal.position.y - shieldConfig.radius - 8,
        },
        text: `◇${Math.round(result.absorbed)}`,
        color: shieldConfig.color,
        life: 0.65,
      });
      this.effects.spawn(result.broke ? GAME_EFFECT_IDS.shieldBreak : GAME_EFFECT_IDS.shieldHit, {
        position: signal.position,
        rotation: shieldConfig.rotation,
        color: shieldConfig.color,
        data: { radius: shieldConfig.radius, sides: shieldConfig.sides },
      });
    }
    if (result.healthDamage <= 0) return result;

    signal.hp -= result.healthDamage;
    this.floatingTexts.push({
      position: { x: signal.position.x + (seededNoise(signal.id + this.elapsed + 17) - 0.5) * 18, y: signal.position.y - 18 },
      text: `${Math.round(result.healthDamage)}`,
      color,
      life: 0.65,
    });
    if (signal.hp <= 0) {
      signal.dead = true;
      this.outcomeFor(this.wave, this.signalVariant(signal)).defeated += 1;
      this.signalIndex.remove(signal.id);
      this.shards += signal.reward;
      this.score += signal.maxHp;
      this.effects.spawnMany(['game:signal-pop-ring', 'game:signal-pop-sparks'], {
        position: signal.position,
        color: definition.visual.color,
        lifetimeScale: signal.variantId === signal.type ? definition.visual.deathEffectScale ?? 1 : 1,
      });
      this.queueSignalSplit(signal);
    }
    return result;
  }

  private queueSignalSplit(parent: Signal): void {
    const split = getSignalCapability(signalRegistry.require(parent.type), 'split-on-death');
    if (!split || parent.variantId !== parent.type) return;
    this.pendingSignalSplits.push({
      parent,
      position: { ...parent.position },
      age: 0,
      duration: split.rippleDuration,
      spawned: false,
    });
    this.effects.spawn(GAME_EFFECT_IDS.fractureSplitRipple, {
      position: parent.position,
      color: split.effectColor,
    });
  }

  private updatePendingSignalSplits(delta: number): void {
    for (const pending of this.pendingSignalSplits) {
      pending.age += delta;
      const split = getSignalCapability(signalRegistry.require(pending.parent.type), 'split-on-death');
      if (!split || pending.spawned || pending.age + SIMULATION_TIME_EPSILON < split.delay) continue;
      pending.spawned = true;
      this.spawnSplitChildren(pending.parent);
    }
    let aliveCount = 0;
    for (const pending of this.pendingSignalSplits) {
      if (pending.age >= pending.duration) continue;
      this.pendingSignalSplits[aliveCount] = pending;
      aliveCount += 1;
    }
    this.pendingSignalSplits.length = aliveCount;
  }

  private spawnSplitChildren(parent: Signal): void {
    const split = getSignalCapability(signalRegistry.require(parent.type), 'split-on-death');
    if (!split || parent.variantId !== parent.type) return;
    const route = this.routeForSignal(parent);
    const lastSafeDistance = Math.max(0, route.length - 1);
    for (let index = 0; index < split.count; index += 1) {
      const offset = (index - (split.count - 1) / 2) * split.spacing;
      const childDistance = Math.max(0, Math.min(lastSafeDistance, parent.distance + offset));
      const at = route.pointAtDistance(childDistance);
      const maxHp = Math.max(1, Math.round(parent.maxHp * split.healthScale));
      const child: Signal = {
        id: this.nextId++,
        type: parent.type,
        variantId: split.childVariantId as SignalVariantId,
        routeId: parent.routeId,
        progress: childDistance / route.length,
        distance: childDistance,
        position: at.position,
        angle: at.angle,
        hp: maxHp,
        maxHp,
        speed: parent.speed * split.speedScale,
        reward: Math.max(1, Math.round(parent.reward * split.rewardScale)),
        coreDamage: Math.max(1, Math.round(parent.coreDamage * split.coreDamageScale)),
        radius: parent.radius * split.radiusScale,
        slowFactor: 0,
        slowTime: 0,
        hitFlash: 0,
        ...createSignalShield(undefined, 1),
        statuses: [],
        dead: false,
      };
      this.signals.push(child);
      this.outcomeFor(this.wave, this.signalVariant(child)).spawned += 1;
      this.signalIndex.update(child);
    }
  }

  private applyStatus(signal: Signal, status: StatusApplication): boolean {
    if (signal.dead || status.duration <= 0) return false;
    const existing = signal.statuses.find((item) => item.id === status.id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, status.duration);
      existing.duration = status.duration;
      existing.damage = Math.max(existing.damage, status.damage);
      existing.interval = status.interval;
      existing.color = status.color;
      if (status.particle) {
        existing.particle = status.particle;
        existing.particleTimer = Math.min(
          existing.particleTimer,
          Math.max(FIXED_SIMULATION_STEP, status.particle.interval),
        );
      } else {
        delete existing.particle;
        existing.particleTimer = 0;
      }
      return false;
    }
    signal.statuses.push({
      ...status,
      remaining: status.duration,
      tickTimer: status.interval,
      particleTimer: status.particle?.interval ?? 0,
    });
    return true;
  }

  private updateSignalStatuses(signal: Signal, delta: number): void {
    for (const status of signal.statuses) {
      const activeDelta = Math.min(delta, Math.max(0, status.remaining));
      status.remaining -= delta;
      status.tickTimer -= activeDelta;
      if (status.particle) {
        const particleInterval = Math.max(FIXED_SIMULATION_STEP, status.particle.interval);
        status.particleTimer -= activeDelta;
        while (status.particleTimer <= 0 && !signal.dead) {
          this.effects.spawn(status.particle.effectId, {
            position: signal.position,
            rotation: signal.angle,
            color: status.color,
            data: { radius: signal.radius },
          });
          status.particleTimer += particleInterval;
        }
      }
      while (status.tickTimer <= 0 && !signal.dead) {
        this.applyDamage(signal, status.damage, status.color);
        status.tickTimer += status.interval;
      }
    }
    let aliveCount = 0;
    for (const status of signal.statuses) {
      if (status.remaining <= 0) continue;
      signal.statuses[aliveCount] = status;
      aliveCount += 1;
    }
    signal.statuses.length = aliveCount;
  }

  private updateVisuals(delta: number): void {
    for (const signal of this.signals) {
      signal.hitFlash = Math.max(0, signal.hitFlash - delta * 7);
      signal.shieldHitFlash = Math.max(0, signal.shieldHitFlash - delta * 6);
      signal.shieldRippleAge = Math.min(2, signal.shieldRippleAge + delta);
    }
    for (const text of this.floatingTexts) {
      text.life -= delta;
      text.position.y -= delta * 34;
    }
    let aliveCount = 0;
    for (const text of this.floatingTexts) {
      if (text.life <= 0) continue;
      this.floatingTexts[aliveCount] = text;
      aliveCount += 1;
    }
    this.floatingTexts.length = aliveCount;
  }

  private cleanEntities(): void {
    let aliveSignalCount = 0;
    for (const signal of this.signals) {
      if (signal.dead) this.signalIndex.remove(signal.id);
      let keep = !signal.dead;
      if (!keep) {
        for (const split of this.pendingSignalSplits) {
          if (!split.spawned && split.parent === signal) {
            keep = true;
            break;
          }
        }
      }
      if (!keep) continue;
      this.signals[aliveSignalCount] = signal;
      aliveSignalCount += 1;
    }
    this.signals.length = aliveSignalCount;

    let aliveProjectileCount = 0;
    for (const projectile of this.projectiles) {
      if (projectile.life <= 0) continue;
      this.projectiles[aliveProjectileCount] = projectile;
      aliveProjectileCount += 1;
    }
    this.projectiles.length = aliveProjectileCount;
  }

  private rollDraftChoices(): ModuleId[] {
    const result = rollModuleDraft({
      definitions: this.modules.list(),
      ownedCount: (moduleId) => this.getModuleCount(moduleId),
      random: this.towerRandom,
      previousChoices: this.previousDraftChoices,
      draftsWithoutRare: this.draftsWithoutRare,
    });
    this.previousDraftChoices = result.previousChoices;
    this.draftsWithoutRare = result.draftsWithoutRare;
    return result.choices;
  }

  private beginModuleDraft(totalRounds: number): void {
    this.previousDraftChoices.clear();
    this.draft = { round: 1, totalRounds, choices: this.rollDraftChoices() };
    this.status = 'reward';
  }

  private checkWaveEnd(delta: number): void {
    const splitPending = this.pendingSignalSplits.some((split) => !split.spawned);
    const hasPendingSpawns = this.spawnLanes.some((lane) => lane.queue.length > 0);
    if (this.status !== 'wave' || hasPendingSpawns || this.signals.length > 0 || splitPending) {
      this.waveClearDelayLeft = null;
      return;
    }
    if (this.waveClearDelayLeft === null) {
      this.waveClearDelayLeft = WAVE_CLEAR_DELAY;
      return;
    }
    this.waveClearDelayLeft = Math.max(0, this.waveClearDelayLeft - delta);
    if (this.waveClearDelayLeft > SIMULATION_TIME_EPSILON) return;
    this.waveClearDelayLeft = null;

    const bonus = Math.round(
      (ECONOMY_BALANCE.waveBonusBase + this.wave * ECONOMY_BALANCE.waveBonusPerWave) * this.difficulty.economy,
    );
    this.shards += bonus;
    if (this.wave >= this.maxWaves) {
      this.status = 'won';
      this.completeDefense();
      this.emit({ type: 'toast', message: i18n.t('toast.victory'), tone: 'good' });
    } else if (this.mode === 'standard' && !this.tutorialEnabled) {
      this.beginModuleDraft(this.level.moduleDraft.wavePicks);
      this.emit({ type: 'toast', message: i18n.t('toast.waveReward', { bonus }), tone: 'good' });
    } else {
      this.status = 'planning';
      this.emit({ type: 'toast', message: i18n.t('toast.wavePlan', { bonus }), tone: 'good' });
    }
    this.emitState();
  }

}
