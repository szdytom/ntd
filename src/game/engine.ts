import { EffectEngine } from '../effects/engine';
import { gameEffects } from '../effects/game-effects';
import { createModuleRegistry, DRAFT_BALANCE, MODULE_RARITIES } from '../modules';
import type { ModuleCombatApi, StatusApplication } from '../modules/types';
import { COMBAT_BALANCE, ECONOMY_BALANCE } from './balance';
import { segmentCircleHitTime, segmentRegularPolygonHitTime } from './collision';
import { DEFAULT_LEVEL_ID, ENEMIES, getLevel, TOWER_COLORS, WORLD, type LevelDefinition } from './config';
import { DEFAULT_DIFFICULTY_ID, getDifficulty, type DifficultyDefinition } from './difficulty';
import { absorbShieldDamage, createEnemyShield, isInsideRegularShield, updateEnemyShield } from './enemy-shield';
import { angleBetween, distance, normalize, rotate, seededNoise } from './math';
import { createPathSampler, type PathSampler } from './path';
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
  creative?: Partial<Omit<CreativeSetup, 'wave'>> & { wave?: Partial<Record<EnemyType, number>> };
}

const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'kite', 'block', 'hex', 'crown'];
const DEFAULT_CREATIVE_WAVE: Record<EnemyType, number> = { spark: 8, kite: 5, block: 2, hex: 1, crown: 0 };
const MAX_TOWER_LEVEL = 5;
export const FIXED_SIMULATION_STEP = 1 / 120;
const MAX_FRAME_DELTA = 0.1;
const MAX_SIMULATION_STEPS = 24;

const normalizeCreativeEnemyCount = (type: EnemyType, value: number): number => {
  const maximum = ENEMIES[type].unique ? 1 : 40;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(maximum, Math.round(value)));
};

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

  status: GameSnapshot['status'] = 'planning';
  wave = 0;
  readonly maxWaves: number;
  core = 20;
  readonly maxCore = 20;
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
  private scheduledCasts: ScheduledCast[] = [];
  private nextId = 1;
  private dirtyStateTimer = 0;
  private simulationAccumulator = 0;
  private configurationRevision = 0;
  private viewSnapshot!: GameViewSnapshot;
  private readonly towerRandom: () => number;
  private readonly moduleInventory = new Map<ModuleId, number>();
  private draft: GameSnapshot['draft'] = null;
  private previousDraftChoices = new Set<ModuleId>();
  private draftsWithoutRare = 0;
  private creativeSetup: CreativeSetup;
  private readonly combatApi: ModuleCombatApi = {
    nearbyEnemies: (position, radius, excludeIds = []) => this.enemies
      .filter((enemy) => !enemy.dead && !excludeIds.includes(enemy.id) && distance(enemy.position, position) <= radius)
      .sort((a, b) => distance(a.position, position) - distance(b.position, position)),
    dealDamage: (enemy, damage, color) => this.applyDamage(enemy, Math.max(1, Math.round(damage)), color),
    applyStatus: (enemy, status) => this.applyStatus(enemy, status),
    retarget: (projectile, enemy) => {
      const direction = normalize({
        x: enemy.position.x - projectile.position.x,
        y: enemy.position.y - projectile.position.y,
      });
      projectile.targetId = enemy.id;
      projectile.velocity = { x: direction.x * projectile.speed, y: direction.y * projectile.speed };
    },
  };

  constructor(options: GameEngineOptions | number = {}) {
    const normalized = typeof options === 'number' ? { seed: options } : options;
    this.mode = normalized.mode ?? 'creative';
    this.level = getLevel(normalized.levelId ?? DEFAULT_LEVEL_ID);
    this.difficulty = getDifficulty(normalized.difficultyId ?? DEFAULT_DIFFICULTY_ID);
    this.path = createPathSampler(this.level.path);
    this.maxWaves = this.level.waves.length;
    this.shards = Math.round(this.level.startingShards * this.difficulty.economy);
    this.creativeSetup = {
      wave: Object.fromEntries(ENEMY_TYPES.map((type) => [
        type,
        normalizeCreativeEnemyCount(type, normalized.creative?.wave?.[type] ?? DEFAULT_CREATIVE_WAVE[type]),
      ])) as Record<EnemyType, number>,
      healthScale: Math.max(0.25, Math.min(5, normalized.creative?.healthScale ?? 1)),
      speedScale: Math.max(0.25, Math.min(3, normalized.creative?.speedScale ?? 1)),
    };
    this.towerRandom = createSeededRandom(normalized.seed ?? Math.floor(Math.random() * 0x1_0000_0000));
    this.effects.registerMany(gameEffects);
    this.modules.registerEffects(this.effects);
    if (this.mode === 'standard') {
      this.moduleInventory.set('pulse', 3);
      this.moduleInventory.set('frost', 2);
    }
    const first = this.buildTower(0);
    first.slots[0] = 'frost';
    first.slots[1] = 'pulse';
    this.towers.push(first);
    this.selectedTowerId = null;
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

  private emit(event: GameEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  getSnapshot(): GameSnapshot {
    return this.viewSnapshot?.game ?? this.createGameSnapshot();
  }

  private createGameSnapshot(): GameSnapshot {
    const boss = this.enemies.find((enemy) => enemy.type === 'crown' && !enemy.dead);
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
      enemiesAlive: this.enemies.length,
      waveQueue: this.spawnQueue.length,
      selectedTowerId: this.selectedTowerId,
      speed: this.speed,
      paused: this.paused,
      draft: this.draft ? { ...this.draft, choices: [...this.draft.choices] } : null,
      boss: boss ? {
        name: ENEMIES[boss.type].name,
        hp: Math.max(0, Math.round(boss.hp)),
        maxHp: boss.maxHp,
        shield: Math.max(0, Math.round(boss.shield)),
        maxShield: boss.maxShield,
      } : null,
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
        wave: Object.freeze({ ...this.creativeSetup.wave }),
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
    if (this.mode === 'creative') {
      return ENEMY_TYPES.flatMap((type) => Array.from({ length: this.creativeSetup.wave[type] }, () => type));
    }
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
      this.emit({ type: 'toast', message: '该节点已达到最高等级', tone: 'info' });
      return;
    }
    const cost = this.getTowerUpgradeCost(tower);
    if (this.shards < cost) {
      this.emit({ type: 'toast', message: `升级需要 ${cost} 晶片`, tone: 'warn' });
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
    this.emit({ type: 'toast', message: `节点升级至 Lv.${tower.level}`, tone: 'good' });
    this.markConfigurationChanged();
    this.emitState();
  }

  getCreativeSetup(): CreativeSetup {
    return { ...this.creativeSetup, wave: { ...this.creativeSetup.wave } };
  }

  configureCreativeEnemy(type: EnemyType, count: number): void {
    if (this.mode !== 'creative' || !Number.isFinite(count)) return;
    this.creativeSetup.wave[type] = normalizeCreativeEnemyCount(type, count);
    this.emitState();
  }

  configureCreativeScales(healthScale: number, speedScale: number): void {
    if (this.mode !== 'creative' || !Number.isFinite(healthScale) || !Number.isFinite(speedScale)) return;
    this.creativeSetup.healthScale = Math.max(0.25, Math.min(5, healthScale));
    this.creativeSetup.speedScale = Math.max(0.25, Math.min(3, speedScale));
    this.emitState();
  }

  spawnCreativeEnemy(type: EnemyType): void {
    if (this.mode !== 'creative' || this.status === 'won' || this.status === 'lost') return;
    if (!this.spawnEnemy(type)) {
      this.emit({ type: 'toast', message: `${ENEMIES[type].name} 已在战场中`, tone: 'warn' });
    }
    this.emitState();
  }

  chooseDraftModule(moduleId: ModuleId): void {
    if (this.status !== 'reward' || !this.draft?.choices.includes(moduleId)) return;
    this.moduleInventory.set(moduleId, (this.moduleInventory.get(moduleId) ?? 0) + 1);
    this.configurationRevision += 1;
    const definition = this.modules.require(moduleId);
    this.emit({ type: 'toast', message: `获得模块：${definition.meta.name}`, tone: 'good' });
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
      this.emit({ type: 'toast', message: '无效的炮塔节点', tone: 'warn' });
      return;
    }
    if (this.towers.some((tower) => tower.padIndex === padIndex)) return;
    if (this.shards < ECONOMY_BALANCE.towerCost) {
      this.emit({ type: 'toast', message: `晶片不足：建造需要 ${ECONOMY_BALANCE.towerCost}`, tone: 'warn' });
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
      message: `新节点构型完成：${tower.slots.length} 槽 · ${tower.maxEnergy} 能量上限`,
      tone: 'good',
    });
    this.markConfigurationChanged();
    this.emitState();
  }

  installModule(slotIndex: number, moduleId: ModuleId | null): void {
    const tower = this.getSelectedTower();
    if (!tower || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= tower.slots.length) return;
    if (moduleId && !this.modules.get(moduleId)) {
      this.emit({ type: 'toast', message: `未知模块：${moduleId}`, tone: 'warn' });
      return;
    }
    if (moduleId && this.mode === 'standard') {
      const installedElsewhere = this.towers.reduce((sum, item) => sum + item.slots.reduce(
        (slotSum, installed, index) => slotSum + (installed === moduleId && !(item.id === tower.id && index === slotIndex) ? 1 : 0),
        0,
      ), 0);
      if (installedElsewhere >= this.getModuleCount(moduleId)) {
        this.emit({ type: 'toast', message: '该模块的库存份数已全部装配', tone: 'warn' });
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
    this.spawnQueue = [...this.getWaveBlueprint(this.wave - 1)];
    this.spawnTimer = 0.25;
    this.emit({ type: 'toast', message: `波次 ${this.wave} / ${this.maxWaves} 已启动`, tone: 'info' });
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
    this.spawnQueue.length = 0;
    this.status = 'planning';
    this.wave = 0;
    this.core = this.maxCore;
    this.shards = Math.round(this.level.startingShards * this.difficulty.economy);
    this.score = 0;
    this.elapsed = 0;
    this.visualElapsed = 0;
    this.simulationAccumulator = 0;
    this.paused = false;
    this.draft = null;
    this.previousDraftChoices.clear();
    this.draftsWithoutRare = 0;
    this.moduleInventory.clear();
    if (this.mode === 'standard') {
      this.moduleInventory.set('pulse', 3);
      this.moduleInventory.set('frost', 2);
    }
    const first = this.buildTower(0);
    first.slots[0] = 'frost';
    first.slots[1] = 'pulse';
    this.towers.push(first);
    this.selectedTowerId = null;
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
    this.updateTowers(delta);
    this.updateScheduledCasts(delta);
    this.updateProjectiles(delta);
    this.cleanEntities();
    this.checkWaveEnd();

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

  private spawnEnemy(type: EnemyType): boolean {
    const config = ENEMIES[type];
    if (config.unique && this.enemies.some((enemy) => !enemy.dead && enemy.type === type)) return false;
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
      radius: config.radius,
      slowFactor: 0,
      slowTime: 0,
      hitFlash: 0,
      ...createEnemyShield(config.shield, scale),
      statuses: [],
      dead: false,
    });
    return true;
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const shieldConfig = ENEMIES[enemy.type].shield;
      const shieldUpdate = updateEnemyShield(enemy, shieldConfig, delta);
      if (shieldUpdate.restored && shieldConfig) {
        enemy.shieldRippleAge = 0;
        this.effects.spawn('game:shield-restore', {
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
        const damage = ENEMIES[enemy.type].coreDamage;
        this.core = Math.max(0, this.core - damage);
        this.effects.spawn('game:core-hit', {
          position: this.path.pointAtDistance(this.path.length - 54).position,
          color: '#ff5c5c',
        });
        this.emit({ type: 'toast', message: `核心受到 ${damage} 点伤害`, tone: 'warn' });
        if (this.core <= 0) {
          this.status = 'lost';
          this.emitState();
        }
      }
    }
  }

  private updateTowers(delta: number): void {
    for (const tower of this.towers) {
      tower.energy = Math.min(tower.maxEnergy, tower.energy + tower.energyRegen * delta);
      tower.cooldownLeft = Math.max(0, tower.cooldownLeft - delta);
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

  private findTarget(tower: Tower): Enemy | null {
    const candidates = this.enemies.filter(
      (enemy) => !enemy.dead && distance(enemy.position, tower.position) <= tower.range,
    );
    if (candidates.length === 0) return null;
    const density = tower.targeting.startsWith('density')
      ? new Map(candidates.map((enemy) => [enemy.id, this.enemies.reduce(
        (count, other) => count + (!other.dead && distance(enemy.position, other.position) <= 92 ? 1 : 0),
        0,
      )]))
      : new Map<number, number>();
    const compare: Record<TargetingMode, (a: Enemy, b: Enemy) => number> = {
      'core-nearest': (a, b) => b.progress - a.progress,
      'core-farthest': (a, b) => a.progress - b.progress,
      'hp-lowest': (a, b) => a.hp - b.hp || b.progress - a.progress,
      'hp-highest': (a, b) => b.hp - a.hp || b.progress - a.progress,
      'tower-nearest': (a, b) => distance(a.position, tower.position) - distance(b.position, tower.position),
      'tower-farthest': (a, b) => distance(b.position, tower.position) - distance(a.position, tower.position),
      'density-highest': (a, b) => (density.get(b.id) ?? 0) - (density.get(a.id) ?? 0) || b.progress - a.progress,
      'density-lowest': (a, b) => (density.get(a.id) ?? 0) - (density.get(b.id) ?? 0) || b.progress - a.progress,
    };
    return candidates.sort(compare[tower.targeting])[0] ?? null;
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
    const baseAngle = target ? angleBetween(launchOrigin, target.position) : tower.rotation;
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
      const spawnDistance = triggeredCast ? 4 : 27;
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
        if (projectile.age >= config.armTime && projectile.triggerCooldown <= 0) {
          const target = this.combatApi.nearbyEnemies(projectile.position, config.triggerRadius)[0];
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

      if (projectile.seeking > 0 && projectile.targetId !== null) {
        const target = this.enemies.find((enemy) => enemy.id === projectile.targetId && !enemy.dead);
        if (target) {
          const desired = normalize({ x: target.position.x - projectile.position.x, y: target.position.y - projectile.position.y });
          const current = normalize(projectile.velocity);
          const blend = Math.min(1, projectile.seeking * delta);
          const direction = normalize({
            x: current.x * (1 - blend) + desired.x * blend,
            y: current.y * (1 - blend) + desired.y * blend,
          });
          projectile.velocity = { x: direction.x * projectile.speed, y: direction.y * projectile.speed };
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
    this.modules.dispatch('onHit', projectile.modules, {
      effects: this.effects,
      position: { ...enemy.position },
      rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
      color: projectile.color,
      shot: projectile.shot,
      projectile,
      enemy,
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
      for (const nearby of this.enemies) {
        if (nearby.id !== enemy.id && !nearby.dead && distance(nearby.position, enemy.position) <= projectile.splash) {
          this.applyDamage(nearby, Math.round(projectile.damage * COMBAT_BALANCE.splashDamageFactor), projectile.color);
        }
      }
    }
    projectile.pierce -= 1;
    if (projectile.pierce < 0) projectile.life = 0;
    else {
      projectile.position.x += normalize(projectile.velocity).x * (enemy.radius + 8);
      projectile.position.y += normalize(projectile.velocity).y * (enemy.radius + 8);
    }
  }

  private findTriggerTarget(position: Point): Enemy | null {
    return this.enemies
      .filter((enemy) => !enemy.dead && distance(enemy.position, position) <= 280)
      .sort((a, b) => b.progress - a.progress)[0] ?? null;
  }

  private findFirstProjectileHit(
    projectile: Projectile,
    start: Point,
    end: Point,
  ): { enemy: Enemy; time: number } | null {
    let first: { enemy: Enemy; time: number } | null = null;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
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
      this.effects.spawn(result.broke ? 'game:shield-break' : 'game:shield-hit', {
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
        lifetimeScale: enemy.type === 'crown' ? 1.8 : 1,
      });
    }
    return result;
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
    this.enemies.splice(0, this.enemies.length, ...this.enemies.filter((enemy) => !enemy.dead));
    this.projectiles.splice(0, this.projectiles.length, ...this.projectiles.filter((projectile) => projectile.life > 0));
  }

  private rollDraftChoices(): ModuleId[] {
    const definitions = this.modules.list();
    const projectilePool = definitions.filter((definition) => definition.kind === 'projectile');
    const modifierPool = definitions.filter(
      (definition) => definition.kind === 'modifier' || definition.kind === 'trail',
    );
    const utilityPool = definitions.filter(
      (definition) => definition.kind === 'logic' || definition.kind === 'static',
    );
    const selected: ModuleId[] = [];
    const pick = (pool: typeof definitions): boolean => {
      const candidates = pool.filter((definition) => !selected.includes(definition.id));
      if (candidates.length === 0) return false;
      const weights = candidates.map((definition) => {
        const novelty = this.previousDraftChoices.has(definition.id) ? 0.22 : 1;
        const ownership = 1 / (1 + this.getModuleCount(definition.id) * 0.45);
        const rarity = MODULE_RARITIES[definition.meta.rarity].draftWeight;
        return novelty * ownership * rarity;
      });
      let roll = this.towerRandom() * weights.reduce((sum, weight) => sum + weight, 0);
      let choice = candidates.at(-1);
      if (!choice) return false;
      for (let index = 0; index < candidates.length; index += 1) {
        roll -= weights[index] ?? 0;
        if (roll <= 0) {
          choice = candidates[index] ?? choice;
          break;
        }
      }
      selected.push(choice.id);
      return true;
    };

    const projectileCount = 1 + (this.towerRandom() < 0.5 ? 1 : 0);
    const modifierCount = 1 + (this.towerRandom() < 0.5 ? 1 : 0);
    for (let index = 0; index < projectileCount; index += 1) pick(projectilePool);
    for (let index = 0; index < modifierCount; index += 1) pick(modifierPool);
    while (selected.length < DRAFT_BALANCE.choicesPerOffer && pick(utilityPool)) {
      // Continue until the offer is full or the unique utility pool is exhausted.
    }

    const highRarity = (moduleId: ModuleId): boolean => {
      const rarity = this.modules.require(moduleId).meta.rarity;
      return rarity === 'rare' || rarity === 'legendary';
    };
    if (!selected.some(highRarity) && this.draftsWithoutRare >= DRAFT_BALANCE.dryOffersBeforePity) {
      const replaceIndex = selected.length - 1;
      const replacedId = selected[replaceIndex];
      if (!replacedId) return selected;
      const replaced = this.modules.require(replacedId);
      const sameDraftGroup = (definition: (typeof definitions)[number]): boolean => {
        if (replaced.kind === 'projectile') return definition.kind === 'projectile';
        if (replaced.kind === 'modifier' || replaced.kind === 'trail') {
          return definition.kind === 'modifier' || definition.kind === 'trail';
        }
        return definition.kind === 'logic' || definition.kind === 'static';
      };
      const pityPool = definitions.filter(
        (definition) => sameDraftGroup(definition) && highRarity(definition.id) && !selected.includes(definition.id),
      );
      if (pityPool.length > 0) {
        const pityChoice = pityPool[Math.floor(this.towerRandom() * pityPool.length)];
        if (pityChoice) selected[replaceIndex] = pityChoice.id;
      }
    }
    if (selected.some(highRarity)) this.draftsWithoutRare = 0;
    else this.draftsWithoutRare += 1;
    this.previousDraftChoices = new Set(selected);
    return selected;
  }

  private beginModuleDraft(): void {
    this.previousDraftChoices.clear();
    this.draft = { round: 1, totalRounds: DRAFT_BALANCE.picksPerWave, choices: this.rollDraftChoices() };
    this.status = 'reward';
  }

  private checkWaveEnd(): void {
    if (this.status !== 'wave' || this.spawnQueue.length > 0 || this.enemies.length > 0) return;
    const bonus = Math.round(
      (ECONOMY_BALANCE.waveBonusBase + this.wave * ECONOMY_BALANCE.waveBonusPerWave) * this.difficulty.economy,
    );
    this.shards += bonus;
    if (this.wave >= this.maxWaves) {
      this.status = 'won';
      this.emit({ type: 'toast', message: '所有信号已净化，棱镜核心稳定！', tone: 'good' });
    } else if (this.mode === 'standard') {
      this.beginModuleDraft();
      this.emit({ type: 'toast', message: `波次完成 · +${bonus} 晶片 · 选择模块奖励`, tone: 'good' });
    } else {
      this.status = 'planning';
      this.emit({ type: 'toast', message: `波次完成 · 规划奖励 +${bonus} 晶片`, tone: 'good' });
    }
    this.emitState();
  }

}
