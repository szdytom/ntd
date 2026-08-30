import { EffectEngine } from '../effects/engine';
import { GAME_EFFECT_IDS, gameEffects } from '../effects/game-effects';
import { createModuleRegistry } from '../modules';
import type { ModuleCombatApi, StatusApplication, TargetEffectChannel } from '../modules/types';
import i18n from '../i18n';
import { COMBAT_BALANCE, ECONOMY_BALANCE } from './balance';
import { segmentCircleHitTime, segmentRegularPolygonHitTime } from './collision';
import {
  DEFAULT_LEVEL_ID,
  ENEMIES,
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
import { limitEnemyContinuousHealthDamage, limitEnemyHealthDamage } from './enemy-armor';
import { absorbShieldDamage, createEnemyShield, isInsideRegularShield, updateEnemyShield } from './enemy-shield';
import { enemyMovementSpeedMultiplier } from './enemy-movement';
import { findPathInterception } from './interception';
import { angleBetween, distance, normalize, rotate, seededNoise } from './math';
import { resolveRoute, type NodeId, type PathSampler } from './path';
import { EnemySpatialIndex } from './spatial-index';
import { selectTowerTarget } from './targeting';
import { createSeededRandom, rollTowerStats } from './tower-generation';
import type {
  CreativeSetup,
  DifficultyId,
  Enemy,
  EnemyType,
  FloatingText,
  GameEvent,
  GameMode,
  GameSnapshot,
  GameViewSnapshot,
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
} from './types';

type Listener = (event: GameEvent) => void;
type ViewListener = () => void;

interface SpawnLane {
  entrance: NodeId;
  queue: EnemyType[];
  timer: number;
}
const NO_EXCLUDED_ENEMY_IDS: readonly number[] = [];

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
export const FRACTURE_SPLIT_DELAY = 0.14;
export const FRACTURE_RIPPLE_DURATION = 0.46;
const MAX_FRAME_DELTA = 0.1;
const MAX_SIMULATION_STEPS = 24;
const SIMULATION_TIME_EPSILON = 1e-9;
const SEEKING_RETARGET_RADIUS = 320;
const TERRAIN_TRIGGER_CROSSING_TICKS = 'terrain-trigger:crossing-ticks';
const MAX_ENEMY_COLLISION_RADIUS = Math.max(
  ...Object.values(ENEMIES).map((enemy) => Math.max(enemy.radius, enemy.shield?.radius ?? 0)),
);

const normalizeCreativeCoreStability = (value: number): number => Number.isFinite(value)
  ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value)))
  : 20;
const normalizeCreativeWaveCount = (value: number): number => Number.isFinite(value)
  ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value)))
  : 1;

interface PendingEnemySplit extends SplitRift {
  parent: Enemy;
  spawned: boolean;
}

export class GameEngine {
  readonly towers: Tower[] = [];
  readonly enemies: Enemy[] = [];
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
  visualElapsed = 0;
  pointer: Point | null = null;

  private listeners = new Set<Listener>();
  private viewListeners = new Set<ViewListener>();
  private spawnLanes: SpawnLane[] = [];
  private waveClearDelayLeft: number | null = null;
  private scheduledCasts: ScheduledCast[] = [];
  private pendingEnemySplits: PendingEnemySplit[] = [];
  private nextId = 1;
  private dirtyStateTimer = 0;
  private simulationAccumulator = 0;
  private configurationRevision = 0;
  private viewSnapshot!: GameViewSnapshot;
  private readonly towerRandom: () => number;
  private readonly moduleInventory = new Map<ModuleId, number>();
  private readonly enemyIndex = new EnemySpatialIndex();
  private readonly spaceRiftByKey = new Map<string, SpaceRift>();
  private readonly spaceRiftCoverage = new Map<Enemy, SpaceRift>();
  private readonly spaceRiftCrossings = new Map<Enemy, Point>();
  private readonly spaceRiftEnemies = new Map<number, Enemy>();
  private readonly routeCache = new Map<NodeId, PathSampler>();
  private readonly spatialCandidates: Enemy[] = [];
  private readonly nearbyCandidates: Enemy[] = [];
  private readonly movementStart: Point = { x: 0, y: 0 };
  private readonly movementEnd: Point = { x: 0, y: 0 };
  private towerAuraCooldown = 1;
  private towerAuraEnergyRegen = 1;
  private draft: GameSnapshot['draft'] = null;
  private previousDraftChoices = new Set<ModuleId>();
  private draftsWithoutRare = 0;
  private creativeSetup: CreativeSetup;
  private readonly combatApi: ModuleCombatApi = {
    // Unsorted, non-allocating: consumers must not retain the returned array.
    nearbyEnemies: (position, radius, excludeIds = NO_EXCLUDED_ENEMY_IDS) => (
      this.enemyIndex.collectWithinRadius(position, radius, this.nearbyCandidates, excludeIds)
    ),
    nearestEnemy: (position, radius, excludeIds = NO_EXCLUDED_ENEMY_IDS) => (
      this.enemyIndex.findNearestWithinRadius(position, radius, excludeIds)
    ),
    dealDamage: (enemy, damage, color, source) => {
      const result = this.applyDamage(enemy, Math.max(1, Math.round(damage)), color);
      if (source && result.healthDamage > 0) {
        this.refundProjectileEnergy(source, result.healthDamage);
        this.dispatchTargetEffect(source, enemy, 'damage', result.healthDamage);
      }
      return result.healthDamage;
    },
    affectTarget: (enemy, source, channel) => this.dispatchTargetEffect(source, enemy, channel),
    applySlow: (enemy, factor, duration) => {
      if (enemy.dead || factor <= 0 || duration <= 0) return false;
      const enteredSlow = enemy.slowFactor <= 0 || enemy.slowTime <= 0;
      enemy.slowFactor = Math.max(enemy.slowFactor, factor);
      enemy.slowTime = Math.max(enemy.slowTime, duration);
      return enteredSlow;
    },
    applyStatus: (enemy, status) => this.applyStatus(enemy, status),
    retarget: (projectile, enemy) => {
      const direction = normalize({
        x: enemy.position.x - projectile.position.x,
        y: enemy.position.y - projectile.position.y,
      });
      projectile.targetId = enemy.id;
      projectile.velocity.x = direction.x * projectile.speed;
      projectile.velocity.y = direction.y * projectile.speed;
    },
    displace: (enemy, distanceDelta) => this.displaceEnemy(enemy, distanceDelta),
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
    return this.pendingEnemySplits;
  }

  private emit(event: GameEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  getSnapshot(): GameSnapshot {
    return this.viewSnapshot?.game ?? this.createGameSnapshot();
  }

  private countWaveSignals(): Readonly<Partial<Record<EnemyType, number>>> {
    const counts: Partial<Record<EnemyType, number>> = {};
    const increment = (type: EnemyType): void => {
      counts[type] = (counts[type] ?? 0) + 1;
    };
    for (const lane of this.spawnLanes) {
      for (const type of lane.queue) increment(type);
    }
    for (const enemy of this.enemies) {
      if (!enemy.dead) increment(enemy.type);
    }
    for (const split of this.pendingEnemySplits) {
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
      enemiesAlive: this.enemies.filter((enemy) => !enemy.dead).length
        + this.pendingEnemySplits.filter((split) => !split.spawned).length,
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

  routeForEnemy(enemy: Enemy): PathSampler {
    return this.routeFor(enemy.routeId);
  }

  distanceToCore(enemy: Enemy): number {
    return Math.max(0, this.routeForEnemy(enemy).length - enemy.distance);
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
      ? definitions
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
    tower.targeting = mode;
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

  spawnCreativeEnemy(type: EnemyType, requestedEntrance?: NodeId): void {
    if (this.mode !== 'creative' || this.status === 'won' || this.status === 'lost') return;
    const entrance = requestedEntrance ?? this.level.graph.entrances[0];
    if (!entrance) return;
    if (!this.level.graph.entrances.includes(entrance)) throw new Error(`Unknown route entrance: ${entrance}`);
    this.spawnEnemy(type, entrance);
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
    this.enemies.length = 0;
    this.enemyIndex.clear();
    this.projectiles.length = 0;
    this.spaceRifts.length = 0;
    this.spaceRiftByKey.clear();
    this.effects.clear();
    this.floatingTexts.length = 0;
    this.scheduledCasts.length = 0;
    this.pendingEnemySplits.length = 0;
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
    this.visualElapsed = 0;
    this.simulationAccumulator = 0;
    this.paused = false;
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
    this.elapsed += delta;
    this.updateVisuals(delta);
    this.effects.update(delta);

    this.spawnEnemies(delta);
    this.updateEnemies(delta);
    this.updatePendingEnemySplits(delta);
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
      this.spawnEnemy(type, lane.entrance);
      lane.timer = ENEMIES[type].spawnDelay;
    }
  }

  private spawnEnemy(type: EnemyType, routeId: NodeId): void {
    const config = ENEMIES[type];
    const creativeHealthScale = this.mode === 'creative' ? this.creativeSetup.healthScale : 1;
    const creativeSpeedScale = this.mode === 'creative' ? this.creativeSetup.speedScale : 1;
    const scale = Math.pow(COMBAT_BALANCE.waveHealthGrowth, Math.max(0, this.wave - 1))
      * this.level.enemyHealthScale
      * this.difficulty.enemyHealth
      * creativeHealthScale;
    const route = this.routeFor(routeId);
    const at = route.pointAtDistance(0);
    const enemy: Enemy = {
      id: this.nextId++,
      type,
      routeId,
      progress: 0,
      distance: 0,
      position: at.position,
      angle: at.angle,
      hp: Math.round(config.hp * scale),
      maxHp: Math.round(config.hp * scale),
      speed: config.speed * this.level.enemySpeedScale * this.difficulty.enemySpeed * creativeSpeedScale,
      movementPhase: 0,
      reward: Math.max(1, Math.round(config.reward * this.difficulty.economy)),
      coreDamage: config.coreDamage,
      radius: config.radius,
      splitGeneration: 0,
      slowFactor: 0,
      slowTime: 0,
      hitFlash: 0,
      ...createEnemyShield(config.shield, scale),
      statuses: [],
      dead: false,
    };
    this.enemies.push(enemy);
    this.enemyIndex.update(enemy);
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead) {
        this.enemyIndex.remove(enemy.id);
        continue;
      }
      const config = ENEMIES[enemy.type];
      const shieldConfig = config.shield;
      const shieldRestored = updateEnemyShield(enemy, shieldConfig, delta);
      if (shieldRestored && shieldConfig) {
        enemy.shieldRippleAge = 0;
        this.effects.spawn(GAME_EFFECT_IDS.shieldRestore, {
          position: enemy.position,
          rotation: shieldConfig.rotation,
          color: shieldConfig.color,
          data: { radius: shieldConfig.radius, sides: shieldConfig.sides },
        });
      }
      this.updateEnemyStatuses(enemy, delta);
      if (enemy.dead) {
        this.enemyIndex.remove(enemy.id);
        continue;
      }
      enemy.slowTime = Math.max(0, enemy.slowTime - delta);
      if (enemy.slowTime <= 0) enemy.slowFactor = 0;
      const movementPhase = enemy.movementPhase ?? 0;
      const movementMultiplier = enemyMovementSpeedMultiplier(config.movement, movementPhase);
      enemy.movementPhase = config.movement
        ? (movementPhase + delta) % config.movement.cycle
        : 0;
      const speed = enemy.speed * movementMultiplier * (1 - enemy.slowFactor);
      enemy.distance += speed * delta;
      const route = this.routeForEnemy(enemy);
      enemy.progress = enemy.distance / route.length;
      enemy.angle = route.sampleInto(enemy.distance, enemy.position);
      if (enemy.distance >= route.length) {
        enemy.dead = true;
        const damage = enemy.coreDamage;
        this.core = Math.max(0, this.core - damage);
        this.effects.spawn('game:core-hit', {
          position: this.getCorePosition(),
          color: '#ff5c5c',
        });
        this.emit({ type: 'toast', message: i18n.t('toast.coreDamaged', { damage }), tone: 'warn' });
        if (this.core <= 0) {
          this.status = 'lost';
          this.emitState();
        }
      }
      this.enemyIndex.update(enemy);
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
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const aura = ENEMIES[enemy.type].aura;
      if (!aura || distance(tower.position, enemy.position) > aura.radius) continue;
      cooldown = Math.max(cooldown, aura.cooldownMultiplier);
      energyRegen = Math.min(energyRegen, aura.energyRegenMultiplier);
    }
    this.towerAuraCooldown = cooldown;
    this.towerAuraEnergyRegen = energyRegen;
  }

  private findTarget(tower: Tower): Enemy | null {
    const candidates = this.enemyIndex.collectWithinRadius(
      tower.position,
      tower.range,
      this.spatialCandidates,
    );
    return selectTowerTarget(
      tower,
      candidates,
      (enemy) => this.enemyIndex.countWithinRadius(enemy.position, 92),
      (enemy) => this.distanceToCore(enemy),
    );
  }

  private updateScheduledCasts(delta: number): void {
    for (const cast of this.scheduledCasts) {
      cast.delay -= delta;
      if (cast.delay > 0) continue;
      const tower = this.towers.find((item) => item.id === cast.towerId);
      const target = this.enemies.find((item) => item.id === cast.targetId && !item.dead) ?? (tower ? this.findTarget(tower) : null);
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

  private castShot(tower: Tower, blueprint: ShotBlueprint, target: Enemy | null, origin?: Point): void {
    const isStatic = blueprint.static !== undefined;
    if (isStatic && origin === undefined) return;
    if (!isStatic && !target) return;
    const launchOrigin = origin ?? tower.position;
    const triggeredCast = origin !== undefined;
    const spawnDistance = triggeredCast ? 4 : 27;
    const interception = target && !isStatic && blueprint.aim !== 'direct'
      ? findPathInterception({
        origin: launchOrigin,
        path: this.routeForEnemy(target),
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
          const nearbyEnemies = this.enemyIndex.collectWithinRadius(
            projectile.position,
            config.gravity.radius,
            this.spatialCandidates,
          );
          for (const enemy of nearbyEnemies) {
            const fieldDistance = this.routeForEnemy(enemy).nearestDistance(projectile.position);
            const offset = fieldDistance - enemy.distance;
            const displacement = Math.sign(offset) * Math.min(Math.abs(offset), config.gravity.pull * delta);
            this.combatApi.displace(enemy, displacement);
          }
        }
        if (projectile.age >= config.armTime && projectile.triggerCooldown <= 0) {
          const target = this.enemyIndex.findNearestWithinRadius(projectile.position, config.triggerRadius);
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
        this.hitEnemy(projectile, hit.enemy);
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
          this.triggerProjectile(projectile, hit?.enemy ?? this.findTriggerTarget(projectile.position));
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
        this.triggerProjectile(projectile, hit?.enemy ?? this.findTriggerTarget(projectile.position));
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
    for (const enemy of this.enemies) {
      if (!enemy.dead) this.spaceRiftEnemies.set(enemy.id, enemy);
    }
    let aliveCount = 0;
    for (const rift of this.spaceRifts) {
      if (rift.source.life <= 0) rift.remaining -= delta;
      if (rift.remaining <= 0) {
        for (const [enemyId, contact] of rift.contacts) {
          const enemy = this.spaceRiftEnemies.get(enemyId);
          if (enemy) this.settleSpaceRiftContact(rift, enemy, contact, true);
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

    for (const enemy of this.spaceRiftEnemies.values()) {
      for (const rift of this.spaceRifts) {
        if (rift.points.length < 2) continue;
        const coveredBy = this.spaceRiftCoverage.get(enemy);
        if (coveredBy && coveredBy.damagePerSecond >= rift.damagePerSecond) continue;
        const crossing = this.findSpaceRiftCrossing(rift, enemy);
        if (!crossing) continue;
        this.spaceRiftCoverage.set(enemy, rift);
        this.spaceRiftCrossings.set(enemy, crossing);
      }
    }

    for (const rift of this.spaceRifts) {
      const nextContacts = new Map<number, SpaceRiftContact>();
      for (const [enemyId, previousContact] of rift.contacts) {
        const enemy = this.spaceRiftEnemies.get(enemyId);
        if (enemy && this.spaceRiftCoverage.get(enemy) !== rift) {
          this.settleSpaceRiftContact(rift, enemy, previousContact, true);
        }
      }
      for (const [enemy, coveredBy] of this.spaceRiftCoverage) {
        if (coveredBy !== rift || enemy.dead) continue;
        const crossing = this.spaceRiftCrossings.get(enemy);
        if (!crossing) continue;
        const contact = rift.contacts.get(enemy.id) ?? {
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
          this.settleSpaceRiftContact(rift, enemy, contact, false);
        }
        if (!enemy.dead) nextContacts.set(enemy.id, contact);
      }
      rift.contacts = nextContacts;
    }
  }

  private findSpaceRiftCrossing(rift: SpaceRift, enemy: Enemy): Point | null {
    const radius = enemy.radius + rift.width * 0.5;
    const radiusSquared = radius * radius;
    for (let index = 1; index < rift.points.length; index += 1) {
      const start = rift.points[index - 1];
      const end = rift.points[index];
      if (!start || !end) continue;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const projection = lengthSquared <= Number.EPSILON ? 0 : Math.max(0, Math.min(1,
        ((enemy.position.x - start.x) * dx + (enemy.position.y - start.y) * dy) / lengthSquared,
      ));
      const x = start.x + dx * projection;
      const y = start.y + dy * projection;
      const offsetX = enemy.position.x - x;
      const offsetY = enemy.position.y - y;
      if (offsetX * offsetX + offsetY * offsetY <= radiusSquared) return { x, y };
    }
    return null;
  }

  private settleSpaceRiftContact(
    rift: SpaceRift,
    enemy: Enemy,
    contact: SpaceRiftContact,
    flushModifier: boolean,
  ): void {
    if (contact.pendingDamage > SIMULATION_TIME_EPSILON && contact.pendingDuration > 0) {
      const result = this.applyDamage(
        enemy,
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
        enemy,
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

  private hitEnemy(projectile: Projectile, enemy: Enemy): void {
    const damageDealt = this.combatApi.dealDamage(enemy, projectile.damage, projectile.color, projectile);
    if (damageDealt <= 0) {
      projectile.life = 0;
      return;
    }
    this.modules.dispatch('onHit', projectile.modules, {
      effects: this.effects,
      position: { ...enemy.position },
      rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
      color: projectile.color,
      shot: projectile.shot,
      projectile,
      enemy,
      damageDealt,
      combat: this.combatApi,
    });
    if (
      (projectile.shot.trigger?.type === 'impact' || projectile.shot.trigger?.type === 'timer') &&
      !projectile.triggered
    ) {
      projectile.triggered = true;
      this.triggerProjectile(projectile, enemy);
    }
    if (projectile.splash > 0) {
      const nearbyEnemies = this.enemyIndex.collectWithinRadius(
        enemy.position,
        projectile.splash,
        this.spatialCandidates,
        enemy.id,
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
      const exitDistance = (enemy.radius + projectile.radius) * 2 + 2;
      const velocityLength = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1;
      projectile.position.x += projectile.velocity.x / velocityLength * exitDistance;
      projectile.position.y += projectile.velocity.y / velocityLength * exitDistance;
      if (projectile.seeking > 0) this.resolveSeekingTarget(projectile);
    }
  }

  private dispatchTargetEffect(
    projectile: Projectile,
    enemy: Enemy,
    channel: TargetEffectChannel,
    damageDealt?: number,
  ): void {
    const tower = this.towers.find((item) => item.id === projectile.towerId);
    this.modules.dispatchTargetEffect(channel, projectile.modules, {
      effects: this.effects,
      position: { ...enemy.position },
      rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
      color: projectile.color,
      shot: projectile.shot,
      ...(tower ? { tower } : {}),
      projectile,
      enemy,
      ...(damageDealt === undefined ? {} : { damageDealt }),
      targetEffectChannel: channel,
      combat: this.combatApi,
    });
  }

  private resolveSeekingTarget(projectile: Projectile): Enemy | null {
    const current = this.enemies.find((enemy) => enemy.id === projectile.targetId && !enemy.dead);
    if (current) return current;

    const remainingRange = Math.max(0, projectile.speed * projectile.life);
    const target = this.enemyIndex.findNearestWithinRadius(
      projectile.position,
      Math.min(SEEKING_RETARGET_RADIUS, remainingRange),
    );
    projectile.targetId = target?.id ?? null;
    if (target) this.combatApi.retarget(projectile, target);
    return target;
  }

  private findTriggerTarget(position: Point): Enemy | null {
    const nearbyEnemies = this.enemyIndex.collectWithinRadius(position, 280, this.spatialCandidates);
    let best: Enemy | null = null;
    for (const enemy of nearbyEnemies) {
      if (!best || this.distanceToCore(enemy) < this.distanceToCore(best)) best = enemy;
    }
    return best;
  }

  private findFirstProjectileHit(
    projectile: Projectile,
    start: Point,
    end: Point,
  ): { enemy: Enemy; time: number } | null {
    let first: { enemy: Enemy; time: number } | null = null;
    const candidates = this.enemyIndex.collectAlongSegment(
      start,
      end,
      MAX_ENEMY_COLLISION_RADIUS + projectile.radius,
      this.spatialCandidates,
    );
    for (const enemy of candidates) {
      const time = this.projectileHitTime(enemy, projectile, start, end);
      if (time !== null && (!first || time < first.time)) first = { enemy, time };
    }
    return first;
  }

  private projectileHitTime(enemy: Enemy, projectile: Projectile, start: Point, end: Point): number | null {
    const shield = ENEMIES[enemy.type].shield;
    if (!shield || enemy.shield <= 0) {
      return segmentCircleHitTime(start, end, enemy.position, enemy.radius + projectile.radius);
    }
    const shieldTime = segmentRegularPolygonHitTime(
      start,
      end,
      (point) => isInsideRegularShield(
        enemy.position.x,
        enemy.position.y,
        point.x,
        point.y,
        shield.radius * enemy.shieldRadiusScale,
        shield.sides,
        shield.rotation,
        projectile.radius,
      ),
      projectile.radius,
    );
    const bodyTime = segmentCircleHitTime(start, end, enemy.position, enemy.radius + projectile.radius);
    if (shieldTime === null) return bodyTime;
    if (bodyTime === null) return shieldTime;
    return Math.min(shieldTime, bodyTime);
  }

  private triggerProjectile(projectile: Projectile, target: Enemy | null): void {
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

  private firePayload(projectile: Projectile, target: Enemy | null): void {
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

  private displaceEnemy(enemy: Enemy, distanceDelta: number): void {
    if (enemy.dead || !Number.isFinite(distanceDelta)) return;
    const route = this.routeForEnemy(enemy);
    enemy.distance = Math.max(0, Math.min(route.length, enemy.distance + distanceDelta));
    enemy.progress = enemy.distance / route.length;
    enemy.angle = route.sampleInto(enemy.distance, enemy.position);
    this.enemyIndex.update(enemy);
  }

  private applyDamage(enemy: Enemy, damage: number, color: string, continuousDuration?: number) {
    if (enemy.dead) return { absorbed: 0, healthDamage: 0, broke: false };
    const shieldConfig = ENEMIES[enemy.type].shield;
    const shieldResult = absorbShieldDamage(enemy, damage * this.difficulty.towerDamage, shieldConfig);
    const result = {
      ...shieldResult,
      healthDamage: continuousDuration === undefined
        ? limitEnemyHealthDamage(shieldResult.healthDamage, ENEMIES[enemy.type].armor)
        : limitEnemyContinuousHealthDamage(
          shieldResult.healthDamage,
          continuousDuration,
          ENEMIES[enemy.type].armor,
        ),
    };
    enemy.hitFlash = 1;
    if (result.absorbed > 0 && shieldConfig) {
      this.floatingTexts.push({
        position: {
          x: enemy.position.x + (seededNoise(enemy.id + this.elapsed) - 0.5) * 18,
          y: enemy.position.y - shieldConfig.radius - 8,
        },
        text: `◇${Math.round(result.absorbed)}`,
        color: shieldConfig.color,
        life: 0.65,
      });
      this.effects.spawn(result.broke ? GAME_EFFECT_IDS.shieldBreak : GAME_EFFECT_IDS.shieldHit, {
        position: enemy.position,
        rotation: shieldConfig.rotation,
        color: shieldConfig.color,
        data: { radius: shieldConfig.radius, sides: shieldConfig.sides },
      });
    }
    if (result.healthDamage <= 0) return result;

    enemy.hp -= result.healthDamage;
    this.floatingTexts.push({
      position: { x: enemy.position.x + (seededNoise(enemy.id + this.elapsed + 17) - 0.5) * 18, y: enemy.position.y - 18 },
      text: `${Math.round(result.healthDamage)}`,
      color,
      life: 0.65,
    });
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.enemyIndex.remove(enemy.id);
      this.shards += enemy.reward;
      this.score += enemy.maxHp;
      this.effects.spawnMany(['game:enemy-pop-ring', 'game:enemy-pop-sparks'], {
        position: enemy.position,
        color: ENEMIES[enemy.type].color,
        lifetimeScale: enemy.type === 'crown' || (enemy.type === 'fracture' && enemy.splitGeneration === 0) ? 1.8 : 1,
      });
      this.queueEnemySplit(enemy);
    }
    return result;
  }

  private queueEnemySplit(parent: Enemy): void {
    const split = ENEMIES[parent.type].split;
    if (!split || parent.splitGeneration > 0) return;
    this.pendingEnemySplits.push({
      parent,
      position: { ...parent.position },
      age: 0,
      duration: FRACTURE_RIPPLE_DURATION,
      spawned: false,
    });
    this.effects.spawn(GAME_EFFECT_IDS.fractureSplitRipple, {
      position: parent.position,
      color: '#73e7f2',
    });
  }

  private updatePendingEnemySplits(delta: number): void {
    for (const pending of this.pendingEnemySplits) {
      pending.age += delta;
      if (pending.spawned || pending.age + SIMULATION_TIME_EPSILON < FRACTURE_SPLIT_DELAY) continue;
      pending.spawned = true;
      this.spawnSplitChildren(pending.parent);
    }
    let aliveCount = 0;
    for (const pending of this.pendingEnemySplits) {
      if (pending.age >= pending.duration) continue;
      this.pendingEnemySplits[aliveCount] = pending;
      aliveCount += 1;
    }
    this.pendingEnemySplits.length = aliveCount;
  }

  private spawnSplitChildren(parent: Enemy): void {
    const split = ENEMIES[parent.type].split;
    if (!split || parent.splitGeneration > 0) return;
    const route = this.routeForEnemy(parent);
    const lastSafeDistance = Math.max(0, route.length - 1);
    for (let index = 0; index < split.count; index += 1) {
      const offset = (index - (split.count - 1) / 2) * split.spacing;
      const childDistance = Math.max(0, Math.min(lastSafeDistance, parent.distance + offset));
      const at = route.pointAtDistance(childDistance);
      const maxHp = Math.max(1, Math.round(parent.maxHp * split.healthScale));
      const child: Enemy = {
        id: this.nextId++,
        type: parent.type,
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
        splitGeneration: parent.splitGeneration + 1,
        slowFactor: 0,
        slowTime: 0,
        hitFlash: 0,
        ...createEnemyShield(undefined, 1),
        statuses: [],
        dead: false,
      };
      this.enemies.push(child);
      this.enemyIndex.update(child);
    }
  }

  private applyStatus(enemy: Enemy, status: StatusApplication): boolean {
    if (enemy.dead || status.duration <= 0) return false;
    const existing = enemy.statuses.find((item) => item.id === status.id);
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
    enemy.statuses.push({
      ...status,
      remaining: status.duration,
      tickTimer: status.interval,
      particleTimer: status.particle?.interval ?? 0,
    });
    return true;
  }

  private updateEnemyStatuses(enemy: Enemy, delta: number): void {
    for (const status of enemy.statuses) {
      const activeDelta = Math.min(delta, Math.max(0, status.remaining));
      status.remaining -= delta;
      status.tickTimer -= activeDelta;
      if (status.particle) {
        const particleInterval = Math.max(FIXED_SIMULATION_STEP, status.particle.interval);
        status.particleTimer -= activeDelta;
        while (status.particleTimer <= 0 && !enemy.dead) {
          this.effects.spawn(status.particle.effectId, {
            position: enemy.position,
            rotation: enemy.angle,
            color: status.color,
            data: { radius: enemy.radius },
          });
          status.particleTimer += particleInterval;
        }
      }
      while (status.tickTimer <= 0 && !enemy.dead) {
        this.applyDamage(enemy, status.damage, status.color);
        status.tickTimer += status.interval;
      }
    }
    let aliveCount = 0;
    for (const status of enemy.statuses) {
      if (status.remaining <= 0) continue;
      enemy.statuses[aliveCount] = status;
      aliveCount += 1;
    }
    enemy.statuses.length = aliveCount;
  }

  private updateVisuals(delta: number): void {
    for (const enemy of this.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - delta * 7);
      enemy.shieldHitFlash = Math.max(0, enemy.shieldHitFlash - delta * 6);
      enemy.shieldRippleAge = Math.min(2, enemy.shieldRippleAge + delta);
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
    let aliveEnemyCount = 0;
    for (const enemy of this.enemies) {
      if (enemy.dead) this.enemyIndex.remove(enemy.id);
      let keep = !enemy.dead;
      if (!keep) {
        for (const split of this.pendingEnemySplits) {
          if (!split.spawned && split.parent === enemy) {
            keep = true;
            break;
          }
        }
      }
      if (!keep) continue;
      this.enemies[aliveEnemyCount] = enemy;
      aliveEnemyCount += 1;
    }
    this.enemies.length = aliveEnemyCount;

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
    const splitPending = this.pendingEnemySplits.some((split) => !split.spawned);
    const hasPendingSpawns = this.spawnLanes.some((lane) => lane.queue.length > 0);
    if (this.status !== 'wave' || hasPendingSpawns || this.enemies.length > 0 || splitPending) {
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
