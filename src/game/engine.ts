import { EffectEngine } from '../effects/engine';
import { GAME_EFFECT_IDS, gameEffects } from '../effects/game-effects';
import { createModuleRegistry, DRAFT_BALANCE } from '../modules';
import type { ModuleCombatApi, StatusApplication } from '../modules/types';
import i18n from '../i18n';
import { COMBAT_BALANCE, ECONOMY_BALANCE } from './balance';
import { segmentCircleHitTime, segmentRegularPolygonHitTime } from './collision';
import { DEFAULT_LEVEL_ID, ENEMIES, getLevel, TOWER_COLORS, WORLD, type LevelDefinition } from './config';
import { DEFAULT_DIFFICULTY_ID, getDifficulty, type DifficultyDefinition } from './difficulty';
import { rollModuleDraft } from './draft';
import { absorbShieldDamage, createEnemyShield, isInsideRegularShield, updateEnemyShield } from './enemy-shield';
import { findPathInterception } from './interception';
import { angleBetween, distance, normalize, rotate, seededNoise } from './math';
import { createPathSampler, type PathSampler } from './path';
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
  SplitRift,
  TargetingMode,
  Tower,
} from './types';

type Listener = (event: GameEvent) => void;
type ViewListener = () => void;

export interface GameEngineOptions {
  seed?: number;
  levelId?: string;
  difficultyId?: DifficultyId;
  mode?: GameMode;
  creative?: Partial<CreativeSetup>;
}

const TUTORIAL_LEVEL_ID = 'starter-elbow';
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
const PROXIMITY_ARM_TARGET_KEY = 'engine:proximity-arm-target';
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
  private spawnQueue: EnemyType[] = [];
  private spawnTimer = 0;
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
  private draft: GameSnapshot['draft'] = null;
  private previousDraftChoices = new Set<ModuleId>();
  private draftsWithoutRare = 0;
  private creativeSetup: CreativeSetup;
  private readonly combatApi: ModuleCombatApi = {
    nearbyEnemies: (position, radius, excludeIds = []) => this.enemyIndex.nearestWithinRadius(position, radius, excludeIds),
    dealDamage: (enemy, damage, color, source) => {
      const result = this.applyDamage(enemy, Math.max(1, Math.round(damage)), color);
      if (source) this.refundProjectileEnergy(source, result.healthDamage);
    },
    applyStatus: (enemy, status) => this.applyStatus(enemy, status),
    retarget: (projectile, enemy) => {
      const direction = normalize({
        x: enemy.position.x - projectile.position.x,
        y: enemy.position.y - projectile.position.y,
      });
      projectile.targetId = enemy.id;
      projectile.velocity = { x: direction.x * projectile.speed, y: direction.y * projectile.speed };
    },
    displace: (enemy, distanceDelta) => this.displaceEnemy(enemy, distanceDelta),
  };

  constructor(options: GameEngineOptions | number = {}) {
    const normalized = typeof options === 'number' ? { seed: options } : options;
    this.mode = normalized.mode ?? 'creative';
    this.level = getLevel(normalized.levelId ?? DEFAULT_LEVEL_ID);
    this.tutorialEnabled = this.mode === 'standard' && this.level.id === TUTORIAL_LEVEL_ID;
    this.difficulty = getDifficulty(normalized.difficultyId ?? DEFAULT_DIFFICULTY_ID);
    this.path = createPathSampler(this.level.path);
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
    if (this.mode === 'standard' && !this.tutorialEnabled) this.beginModuleDraft();
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
      waveQueue: this.spawnQueue.length,
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

  getWaveBlueprint(index: number): readonly EnemyType[] {
    return this.level.waves[Math.min(Math.max(0, index), this.level.waves.length - 1)] ?? [];
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

  spawnCreativeEnemy(type: EnemyType): void {
    if (this.mode !== 'creative' || this.status === 'won' || this.status === 'lost') return;
    this.spawnEnemy(type);
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
    this.spawnQueue = [...this.getWaveBlueprint(this.wave - 1)];
    this.spawnTimer = 0.25;
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
    this.projectiles.length = 0;
    this.effects.clear();
    this.floatingTexts.length = 0;
    this.scheduledCasts.length = 0;
    this.pendingEnemySplits.length = 0;
    this.spawnQueue.length = 0;
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
    if (this.mode === 'standard' && !this.tutorialEnabled) this.beginModuleDraft();
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
    this.enemyIndex.rebuild(this.enemies);
    this.updateTowers(delta);
    this.updateScheduledCasts(delta);
    this.updateProjectiles(delta);
    this.cleanEntities();
    this.checkWaveEnd(delta);

    this.dirtyStateTimer -= delta;
    if (this.dirtyStateTimer <= 0) {
      this.dirtyStateTimer = 0.12;
      this.emitState();
    }
  }

  private spawnEnemies(delta: number): void {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= delta;
    if (this.spawnTimer > 0) return;
    const type = this.spawnQueue.shift();
    if (!type) return;
    this.spawnEnemy(type);
    this.spawnTimer = ENEMIES[type].spawnDelay;
  }

  private spawnEnemy(type: EnemyType): void {
    const config = ENEMIES[type];
    const creativeHealthScale = this.mode === 'creative' ? this.creativeSetup.healthScale : 1;
    const creativeSpeedScale = this.mode === 'creative' ? this.creativeSetup.speedScale : 1;
    const scale = Math.pow(COMBAT_BALANCE.waveHealthGrowth, Math.max(0, this.wave - 1))
      * this.level.enemyHealthScale
      * this.difficulty.enemyHealth
      * creativeHealthScale;
    const at = this.path.pointAtDistance(0);
    this.enemies.push({
      id: this.nextId++,
      type,
      progress: 0,
      distance: 0,
      position: at.position,
      angle: at.angle,
      hp: Math.round(config.hp * scale),
      maxHp: Math.round(config.hp * scale),
      speed: config.speed * this.level.enemySpeedScale * this.difficulty.enemySpeed * creativeSpeedScale,
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
    });
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const shieldConfig = ENEMIES[enemy.type].shield;
      const shieldUpdate = updateEnemyShield(enemy, shieldConfig, delta);
      if (shieldUpdate.restored && shieldConfig) {
        enemy.shieldRippleAge = 0;
        this.effects.spawn(GAME_EFFECT_IDS.shieldRestore, {
          position: enemy.position,
          rotation: shieldConfig.rotation,
          color: shieldConfig.color,
          data: { radius: shieldConfig.radius, sides: shieldConfig.sides },
        });
      }
      this.updateEnemyStatuses(enemy, delta);
      if (enemy.dead) continue;
      enemy.slowTime = Math.max(0, enemy.slowTime - delta);
      if (enemy.slowTime <= 0) enemy.slowFactor = 0;
      const speed = enemy.speed * (1 - enemy.slowFactor);
      enemy.distance += speed * delta;
      enemy.progress = enemy.distance / this.path.length;
      const at = this.path.pointAtDistance(enemy.distance);
      enemy.position = at.position;
      enemy.angle = at.angle;
      if (enemy.distance >= this.path.length) {
        enemy.dead = true;
        const damage = enemy.coreDamage;
        this.core = Math.max(0, this.core - damage);
        this.effects.spawn('game:core-hit', {
          position: this.path.pointAtDistance(this.path.length - 54).position,
          color: '#ff5c5c',
        });
        this.emit({ type: 'toast', message: i18n.t('toast.coreDamaged', { damage }), tone: 'warn' });
        if (this.core <= 0) {
          this.status = 'lost';
          this.emitState();
        }
      }
    }
  }

  private updateTowers(delta: number): void {
    for (const tower of this.towers) {
      const auraModifiers = this.getTowerAuraModifiers(tower);
      tower.energy = Math.min(
        tower.maxEnergy,
        tower.energy + tower.energyRegen * auraModifiers.energyRegen * delta,
      );
      tower.cooldownLeft = Math.max(0, tower.cooldownLeft - delta / auraModifiers.cooldown);
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

  private getTowerAuraModifiers(tower: Tower): { cooldown: number; energyRegen: number } {
    let cooldown = 1;
    let energyRegen = 1;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const aura = ENEMIES[enemy.type].aura;
      if (!aura || distance(tower.position, enemy.position) > aura.radius) continue;
      cooldown = Math.max(cooldown, aura.cooldownMultiplier);
      energyRegen = Math.min(energyRegen, aura.energyRegenMultiplier);
    }
    return { cooldown, energyRegen };
  }

  private findTarget(tower: Tower): Enemy | null {
    const candidates = this.enemyIndex.withinRadius(tower.position, tower.range);
    return selectTowerTarget(
      tower,
      candidates,
      (enemy) => this.enemyIndex.withinRadius(enemy.position, 92).length,
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
    this.scheduledCasts = this.scheduledCasts.filter((cast) => cast.delay > -100);
  }

  private castShot(tower: Tower, blueprint: ShotBlueprint, target: Enemy | null, origin?: Point): void {
    const isStatic = blueprint.static !== undefined;
    if (isStatic && origin === undefined) return;
    if (!isStatic && !target) return;
    const launchOrigin = origin ?? tower.position;
    const triggeredCast = origin !== undefined;
    const spawnDistance = triggeredCast ? 4 : 27;
    const interception = target && !isStatic
      ? findPathInterception({
        origin: launchOrigin,
        path: this.path,
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
          const fieldDistance = this.path.nearestDistance(projectile.position);
          for (const enemy of this.findProximityTargets(projectile.position, config.gravity.radius)) {
            const offset = fieldDistance - enemy.distance;
            const displacement = Math.sign(offset) * Math.min(Math.abs(offset), config.gravity.pull * delta);
            this.combatApi.displace(enemy, displacement);
          }
        }
        const nearbyTarget = this.findProximityTarget(projectile.position, config.triggerRadius);
        if (projectile.age < config.armTime) {
          if (nearbyTarget) projectile.moduleState[PROXIMITY_ARM_TARGET_KEY] = nearbyTarget.id;
          continue;
        }
        if (projectile.age >= config.armTime && projectile.triggerCooldown <= 0) {
          const armedTargetId = projectile.moduleState[PROXIMITY_ARM_TARGET_KEY];
          const armedTarget = typeof armedTargetId === 'number'
            ? this.enemies.find((enemy) => enemy.id === armedTargetId && !enemy.dead) ?? null
            : null;
          delete projectile.moduleState[PROXIMITY_ARM_TARGET_KEY];
          const target = nearbyTarget ?? armedTarget;
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
            if (projectile.shot.trigger?.type === 'proximity') this.firePayload(projectile, target);
            if (projectile.triggerCount >= config.maxTriggers) projectile.life = 0;
          }
        }
        continue;
      }

      projectile.trail.unshift({ ...projectile.position });
      if (projectile.trail.length > 6) projectile.trail.pop();

      if (projectile.seeking > 0) {
        const target = this.resolveSeekingTarget(projectile);
        if (target) {
          const desiredAngle = angleBetween(projectile.position, target.position);
          const currentAngle = Math.atan2(projectile.velocity.y, projectile.velocity.x);
          const angleDifference = ((desiredAngle - currentAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          const maxTurn = projectile.seeking * delta;
          const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDifference));
          projectile.velocity = {
            x: Math.cos(nextAngle) * projectile.speed,
            y: Math.sin(nextAngle) * projectile.speed,
          };
        }
      }

      const movementStart = { ...projectile.position };
      const movementEnd = {
        x: projectile.position.x + projectile.velocity.x * delta,
        y: projectile.position.y + projectile.velocity.y * delta,
      };
      projectile.position = movementEnd;
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

      const hit = this.findFirstProjectileHit(projectile, movementStart, movementEnd);
      if (hit) {
        projectile.position = {
          x: movementStart.x + (movementEnd.x - movementStart.x) * hit.time,
          y: movementStart.y + (movementEnd.y - movementStart.y) * hit.time,
        };
        this.hitEnemy(projectile, hit.enemy);
      }

      if (
        projectile.position.x < -60 || projectile.position.x > WORLD.width + 60 ||
        projectile.position.y < -60 || projectile.position.y > WORLD.height + 60
      ) projectile.life = 0;
    }
  }

  private hitEnemy(projectile: Projectile, enemy: Enemy): void {
    const damage = this.applyDamage(enemy, projectile.damage, projectile.color);
    if (damage.healthDamage <= 0) {
      projectile.life = 0;
      return;
    }
    this.refundProjectileEnergy(projectile, damage.healthDamage);
    this.modules.dispatch('onHit', projectile.modules, {
      effects: this.effects,
      position: { ...enemy.position },
      rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
      color: projectile.color,
      shot: projectile.shot,
      projectile,
      enemy,
      damageDealt: damage.healthDamage,
      combat: this.combatApi,
    });
    if (
      (projectile.shot.trigger?.type === 'impact' || projectile.shot.trigger?.type === 'timer') &&
      !projectile.triggered
    ) {
      projectile.triggered = true;
      this.triggerProjectile(projectile, enemy);
    }
    if (projectile.slow > 0 && !enemy.dead) {
      enemy.slowFactor = Math.max(enemy.slowFactor, projectile.slow);
      enemy.slowTime = Math.max(enemy.slowTime, projectile.shot.slowDuration);
    }
    if (projectile.splash > 0) {
      for (const nearby of this.enemyIndex.withinRadius(enemy.position, projectile.splash, [enemy.id])) {
        const splashDamage = this.applyDamage(
          nearby,
          Math.round(projectile.damage * COMBAT_BALANCE.splashDamageFactor),
          projectile.color,
        );
        this.refundProjectileEnergy(projectile, splashDamage.healthDamage);
      }
    }
    projectile.pierce -= 1;
    if (projectile.pierce < 0) projectile.life = 0;
    else {
      const exitDistance = (enemy.radius + projectile.radius) * 2 + 2;
      projectile.position.x += normalize(projectile.velocity).x * exitDistance;
      projectile.position.y += normalize(projectile.velocity).y * exitDistance;
      if (projectile.seeking > 0) this.resolveSeekingTarget(projectile);
    }
  }

  private resolveSeekingTarget(projectile: Projectile): Enemy | null {
    const current = this.enemies.find((enemy) => enemy.id === projectile.targetId && !enemy.dead);
    if (current) return current;

    const remainingRange = Math.max(0, projectile.speed * projectile.life);
    const target = this.enemyIndex.nearestWithinRadius(
      projectile.position,
      Math.min(SEEKING_RETARGET_RADIUS, remainingRange),
    )[0] ?? null;
    projectile.targetId = target?.id ?? null;
    if (target) this.combatApi.retarget(projectile, target);
    return target;
  }

  private findTriggerTarget(position: Point): Enemy | null {
    return this.enemyIndex.withinRadius(position, 280).reduce<Enemy | null>(
      (best, enemy) => !best || enemy.progress > best.progress ? enemy : best,
      null,
    );
  }

  private findProximityTarget(position: Point, triggerRadius: number): Enemy | null {
    return this.findProximityTargets(position, triggerRadius)[0] ?? null;
  }

  private findProximityTargets(position: Point, triggerRadius: number): Enemy[] {
    return this.enemyIndex.nearestWithinRadius(position, triggerRadius + MAX_ENEMY_COLLISION_RADIUS)
      .filter((enemy) => distance(position, enemy.position) <= triggerRadius + this.enemyCollisionRadius(enemy));
  }

  private enemyCollisionRadius(enemy: Enemy): number {
    const shield = ENEMIES[enemy.type].shield;
    return shield && enemy.shield > 0
      ? Math.max(enemy.radius, shield.radius * enemy.shieldRadiusScale)
      : enemy.radius;
  }

  private findFirstProjectileHit(
    projectile: Projectile,
    start: Point,
    end: Point,
  ): { enemy: Enemy; time: number } | null {
    let first: { enemy: Enemy; time: number } | null = null;
    for (const enemy of this.enemyIndex.alongSegment(start, end, MAX_ENEMY_COLLISION_RADIUS + projectile.radius)) {
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
    enemy.distance = Math.max(0, Math.min(this.path.length, enemy.distance + distanceDelta));
    enemy.progress = enemy.distance / this.path.length;
    const at = this.path.pointAtDistance(enemy.distance);
    enemy.position = at.position;
    enemy.angle = at.angle;
  }

  private applyDamage(enemy: Enemy, damage: number, color: string) {
    if (enemy.dead) return { absorbed: 0, healthDamage: 0, broke: false };
    const shieldConfig = ENEMIES[enemy.type].shield;
    const result = absorbShieldDamage(enemy, damage * this.difficulty.towerDamage, shieldConfig);
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
    this.pendingEnemySplits = this.pendingEnemySplits.filter((pending) => pending.age < pending.duration);
  }

  private spawnSplitChildren(parent: Enemy): void {
    const split = ENEMIES[parent.type].split;
    if (!split || parent.splitGeneration > 0) return;
    const lastSafeDistance = Math.max(0, this.path.length - 1);
    for (let index = 0; index < split.count; index += 1) {
      const offset = (index - (split.count - 1) / 2) * split.spacing;
      const childDistance = Math.max(0, Math.min(lastSafeDistance, parent.distance + offset));
      const at = this.path.pointAtDistance(childDistance);
      const maxHp = Math.max(1, Math.round(parent.maxHp * split.healthScale));
      this.enemies.push({
        id: this.nextId++,
        type: parent.type,
        progress: childDistance / this.path.length,
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
      });
    }
  }

  private applyStatus(enemy: Enemy, status: StatusApplication): void {
    const existing = enemy.statuses.find((item) => item.id === status.id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, status.duration);
      existing.duration = status.duration;
      existing.damage = Math.max(existing.damage, status.damage);
      existing.interval = status.interval;
      existing.color = status.color;
      return;
    }
    enemy.statuses.push({
      ...status,
      remaining: status.duration,
      tickTimer: status.interval,
    });
  }

  private updateEnemyStatuses(enemy: Enemy, delta: number): void {
    for (const status of enemy.statuses) {
      const activeDelta = Math.min(delta, Math.max(0, status.remaining));
      status.remaining -= delta;
      status.tickTimer -= activeDelta;
      while (status.tickTimer <= 0 && !enemy.dead) {
        this.applyDamage(enemy, status.damage, status.color);
        status.tickTimer += status.interval;
      }
    }
    enemy.statuses = enemy.statuses.filter((status) => status.remaining > 0);
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
    this.floatingTexts.splice(0, this.floatingTexts.length, ...this.floatingTexts.filter((text) => text.life > 0));
  }

  private cleanEntities(): void {
    const splittingParentIds = new Set(
      this.pendingEnemySplits.filter((split) => !split.spawned).map((split) => split.parent.id),
    );
    this.enemies.splice(
      0,
      this.enemies.length,
      ...this.enemies.filter((enemy) => !enemy.dead || splittingParentIds.has(enemy.id)),
    );
    this.projectiles.splice(0, this.projectiles.length, ...this.projectiles.filter((projectile) => projectile.life > 0));
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

  private beginModuleDraft(): void {
    this.previousDraftChoices.clear();
    this.draft = { round: 1, totalRounds: DRAFT_BALANCE.picksPerWave, choices: this.rollDraftChoices() };
    this.status = 'reward';
  }

  private checkWaveEnd(delta: number): void {
    const splitPending = this.pendingEnemySplits.some((split) => !split.spawned);
    if (this.status !== 'wave' || this.spawnQueue.length > 0 || this.enemies.length > 0 || splitPending) {
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
      this.beginModuleDraft();
      this.emit({ type: 'toast', message: i18n.t('toast.waveReward', { bonus }), tone: 'good' });
    } else {
      this.status = 'planning';
      this.emit({ type: 'toast', message: i18n.t('toast.wavePlan', { bonus }), tone: 'good' });
    }
    this.emitState();
  }

}
