import type { CSSProperties, DragEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_LEVEL_ID, ENEMIES, getLevel, LEVELS, WORLD, type LevelDefinition } from '../game/config';
import { ECONOMY_BALANCE } from '../game/balance';
import { DEFAULT_DIFFICULTY_ID, DIFFICULTIES, getDifficulty } from '../game/difficulty';
import { GameEngine } from '../game/engine';
import type {
  CreativeSetup,
  DifficultyId,
  EnemyType,
  GameMode,
  GameSnapshot,
  GameViewSnapshot,
  ModuleId,
  ShotBlueprint,
  TargetingMode,
  Tower,
  TowerProgram,
} from '../game/types';
import { MODULE_RARITIES, type ModuleDefinition, type ModuleKind } from '../modules';
import { GameCanvas } from './GameCanvas';
import type { ToastState } from './useGameState';
import { useGameState } from './useGameState';

const KIND_SYMBOL: Record<ModuleKind, string> = { projectile: 'P', static: 'S', modifier: 'M', trail: 'T', logic: 'L' };
const KIND_LABEL: Record<ModuleKind, string> = { projectile: '弹射物', static: '静态载荷', modifier: '修正', trail: '尾迹修正', logic: '逻辑' };
const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'kite', 'block', 'hex', 'crown'];
const TARGETING_OPTIONS: ReadonlyArray<{ value: TargetingMode; label: string }> = [
  { value: 'core-nearest', label: '距核心最近' },
  { value: 'core-farthest', label: '距核心最远' },
  { value: 'hp-lowest', label: '当前血量最低' },
  { value: 'hp-highest', label: '当前血量最高' },
  { value: 'tower-nearest', label: '距炮塔最近' },
  { value: 'tower-farthest', label: '距炮塔最远' },
  { value: 'density-highest', label: '局部密度最高' },
  { value: 'density-lowest', label: '局部密度最低' },
];
const DIFFICULTY_TONE: Record<DifficultyId, string> = {
  relaxed: '最轻松',
  easy: '较轻松',
  normal: '推荐',
  hard: '更困难',
  extreme: '最困难',
};

const variableStyle = (definition: ModuleDefinition): CSSProperties => ({
  '--module-color': definition.meta.color,
  '--module-tint': definition.meta.tint,
  '--rarity-color': MODULE_RARITIES[definition.meta.rarity].color,
  '--rarity-tint': MODULE_RARITIES[definition.meta.rarity].tint,
} as CSSProperties);

function Header({ engine, snapshot, onExit }: { engine: GameEngine; snapshot: GameSnapshot; onExit: () => void }) {
  const waveDisabled = snapshot.status !== 'planning';
  const launchLabel = snapshot.status === 'wave'
    ? `${snapshot.enemiesAlive + snapshot.waveQueue} 个信号`
    : snapshot.status === 'reward'
      ? '等待模块选择'
    : '启动信号';
  const launchWave = snapshot.wave >= snapshot.maxWaves
    ? '已完成'
    : `波次 ${String(snapshot.wave + 1).padStart(2, '0')}`;

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true"><i /><b /><span /></div>
        <div>
          <div className="brand-name">PRISM <span>BASTION</span></div>
          <div className="brand-sub">MODULAR DEFENSE LAB · 07</div>
        </div>
      </div>

      <div className="top-stats" aria-label="游戏状态">
        <div className="metric core-metric">
          <span className="metric-icon heart-icon">♥</span>
          <div><small>核心稳定度</small><strong>{snapshot.core}<em>/{snapshot.maxCore}</em></strong></div>
          <div className="micro-bar"><i style={{ width: `${snapshot.core / snapshot.maxCore * 100}%` }} /></div>
        </div>
        <div className="metric shard-metric">
          <span className="metric-icon shard-icon">◇</span>
          <div><small>晶片</small><strong>{snapshot.shards}</strong></div>
        </div>
        <div className="metric wave-metric">
          <span className="metric-icon wave-icon">≋</span>
          <div><small>信号波次</small><strong>{snapshot.wave}<em>/{snapshot.maxWaves}</em></strong></div>
        </div>
      </div>

      <div className="top-actions">
        <button className="icon-button exit-button" onClick={onExit} aria-label="返回关卡选择">←</button>
        <div className="speed-switch" role="group" aria-label="游戏速度">
          {[1, 2].map((speed) => (
            <button key={speed} className={snapshot.speed === speed ? 'active' : ''} onClick={() => engine.setSpeed(speed)}>{speed}×</button>
          ))}
        </div>
        <button className={`icon-button ${snapshot.paused ? 'active' : ''}`} onClick={() => engine.togglePause()} aria-label="暂停游戏">
          <span className="pause-glyph">{snapshot.paused ? '▶' : 'Ⅱ'}</span>
        </button>
        <button className="launch-button" onClick={() => engine.startWave()} disabled={waveDisabled}>
          <span className="launch-icon">▶</span>
          <span><small>{launchLabel}</small><strong>{launchWave}</strong></span>
        </button>
      </div>
    </header>
  );
}

function EnemyPreview({ engine, wave }: { engine: GameEngine; wave: number }) {
  const blueprint = engine.getWaveBlueprint(wave);
  const counts = new Map<string, number>();
  blueprint.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));
  return (
    <div className="enemy-preview">
      {[...counts.entries()].slice(0, 4).map(([type, count]) => {
        const enemy = ENEMIES[type as keyof typeof ENEMIES];
        const shape = enemy.sides === 3 ? 'tri' : enemy.sides >= 6 ? 'hex' : 'square';
        return (
          <span key={type} title={`${enemy.name} × ${count}`}>
            <i className={shape} style={{ '--preview-color': enemy.color } as CSSProperties} /><b>×{count}</b>
          </span>
        );
      })}
    </div>
  );
}

function Battlefield({ engine, view }: { engine: GameEngine; view: GameViewSnapshot }) {
  const { game: snapshot } = view;
  const phase = snapshot.status === 'wave'
    ? '信号接触中'
    : snapshot.status === 'reward'
      ? '截获模块中'
      : snapshot.paused ? '系统暂停' : '规划阶段';
  const terminal = snapshot.status === 'won' || snapshot.status === 'lost';
  const spawn = engine.path.pointAtDistance(44).position;
  const core = engine.path.pointAtDistance(engine.path.length - 54).position;
  return (
    <section className="battle-card" aria-label="防御战场">
      <div className="battle-head">
        <div>
          <div className="eyebrow"><i className={`live-dot ${snapshot.status === 'wave' && !snapshot.paused ? 'combat' : ''}`} /><span>{phase}</span></div>
          <h1>{engine.level.name} <span>/ {engine.level.sector}</span></h1>
        </div>
        <div className="incoming"><small>下一波信号</small><EnemyPreview engine={engine} wave={snapshot.wave} /></div>
      </div>

      <div className="canvas-wrap">
        <GameCanvas engine={engine} />
        {!snapshot.boss ? null : (
          <div className="boss-status" aria-label={`${snapshot.boss.name} Boss 状态`}>
            <div className="boss-status-head">
              <span><i />GUARDIAN</span>
              <strong>{snapshot.boss.name}</strong>
              <b>{snapshot.boss.hp}/{snapshot.boss.maxHp}</b>
            </div>
            <div className="boss-shield-readout">
              <small>◇ SHIELD</small>
              <div><i style={{ width: `${snapshot.boss.shield / snapshot.boss.maxShield * 100}%` }} /></div>
              <b>{snapshot.boss.shield}/{snapshot.boss.maxShield}</b>
            </div>
            <div className="boss-health-bar"><i style={{ width: `${snapshot.boss.hp / snapshot.boss.maxHp * 100}%` }} /></div>
          </div>
        )}
        <div className="spawn-label" style={{ top: `${spawn.y / WORLD.height * 100}%` }}><i /><span>信号入口</span></div>
        <div className="core-label" style={{ top: `${core.y / WORLD.height * 100}%`, bottom: 'auto' }}><span>棱镜核心</span><i /></div>
        <div className="battle-tip">
          <span className="tip-key">+</span>
          <div><strong>部署新节点</strong><small>点击虚线圆环 · 消耗 {ECONOMY_BALANCE.towerCost} ◇</small></div>
        </div>
        {!terminal ? null : (
          <div className="status-overlay" data-tone={snapshot.status}>
            <div className="status-shape">✦</div>
            <h2>{snapshot.status === 'won' ? '区域净化完成' : '棱镜核心离线'}</h2>
            <p>{snapshot.status === 'won'
              ? `最终净化值 ${snapshot.score} · 核心稳定度 ${snapshot.core}/${snapshot.maxCore}`
              : `坚持到波次 ${snapshot.wave} · 调整模块序列后再次尝试`}</p>
            <button onClick={() => engine.reset()}>重新校准</button>
          </div>
        )}
      </div>

      <footer className="battle-footer">
        <div className="legend">
          <span><i className="tri swatch-yellow" />火花</span>
          <span><i className="square swatch-pink" />风筝</span>
          <span><i className="hex swatch-purple" />重甲</span>
        </div>
        <div className="score-line">
          <span className="mode-chip">{snapshot.mode === 'standard' ? '正式模式' : '创造模式'}</span>
          <span className="difficulty-chip">{engine.difficulty.name}</span>
          净化值 <strong>{String(snapshot.score).padStart(5, '0')}</strong>
        </div>
        <details className="battle-access-controls">
          <summary>键盘战场控制</summary>
          <div>
            {view.towers.map((tower) => (
              <button key={tower.id} onClick={() => engine.selectTower(tower.id)}>选择节点 T{String(tower.id).padStart(2, '0')}</button>
            ))}
            {engine.level.towerPads.map((_, padIndex) => (
              view.towers.some((tower) => tower.padIndex === padIndex)
                ? null
                : <button key={`pad-${padIndex}`} onClick={() => engine.placeTower(padIndex)}>部署节点 {padIndex + 1}</button>
            ))}
          </div>
        </details>
      </footer>
    </section>
  );
}

function ModuleSlot({
  index,
  isLast,
  definition,
  selectedModule,
  engine,
}: {
  index: number;
  isLast: boolean;
  definition: ModuleDefinition | undefined;
  selectedModule: ModuleId | null;
  engine: GameEngine;
}) {
  const dragStart = (event: DragEvent<HTMLButtonElement>): void => {
    event.dataTransfer.setData('text/slot', String(index));
    event.dataTransfer.effectAllowed = 'move';
  };
  const drop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const incoming = event.dataTransfer.getData('text/module');
    const source = event.dataTransfer.getData('text/slot');
    if (incoming) engine.installModule(index, incoming);
    else if (source !== '') engine.swapModules(Number(source), index);
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    engine.swapModules(index, index + (event.key === 'ArrowLeft' ? -1 : 1));
  };

  return (
    <div className="slot-wrap">
      {!definition ? (
        <button
          className="module-slot empty"
          data-slot={index}
          onClick={() => { if (selectedModule) engine.installModule(index, selectedModule); }}
          onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }}
          onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')}
          onDrop={drop}
          aria-label={`空槽位 ${index + 1}`}
        >
          <span>+</span><small>槽 {index + 1}</small>
        </button>
      ) : (
        <div className="filled-slot">
          <button
            className={`module-slot filled ${definition.kind}`}
            style={variableStyle(definition)}
            draggable
            onDragStart={dragStart}
            onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }}
            onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')}
            onDrop={drop}
            onKeyDown={keyDown}
            onClick={() => { if (selectedModule) engine.installModule(index, selectedModule); }}
            aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
            aria-label={`槽位 ${index + 1}：${definition.meta.name}。按 Alt 加左右方向键移动`}
            title={`${definition.meta.name}：${definition.meta.description}；Alt+方向键调整顺序`}
          >
            <span className="slot-kind">{KIND_SYMBOL[definition.kind]}</span>
            <strong>{definition.meta.symbol}</strong>
            <small>{definition.meta.shortName}</small>
          </button>
          <button className="slot-remove" onClick={() => engine.installModule(index, null)} aria-label={`从槽位 ${index + 1} 移除${definition.meta.name}`}>×</button>
        </div>
      )}
      {!isLast ? <span className="flow-arrow">›</span> : null}
    </div>
  );
}

function ModuleCard({
  definition,
  selected,
  exhausted,
  inventoryLabel,
  onSelect,
  onQuickInstall,
}: {
  definition: ModuleDefinition;
  selected: boolean;
  exhausted: boolean;
  inventoryLabel: string | undefined;
  onSelect: () => void;
  onQuickInstall: () => void;
}) {
  const dragStart = (event: DragEvent<HTMLButtonElement>): void => {
    if (exhausted) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/module', definition.id);
    event.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <button
      className={`module-card rarity-${definition.meta.rarity} ${selected ? 'selected' : ''} ${exhausted ? 'exhausted' : ''}`}
      style={variableStyle(definition)}
      draggable={!exhausted}
      onDragStart={dragStart}
      onClick={onSelect}
      onDoubleClick={() => { if (!exhausted) onQuickInstall(); }}
      title={exhausted ? '库存份数已全部装配；拆下后可再次安装' : '双击安装到第一个空槽位'}
    >
      <span className={`kind-badge ${definition.kind}`}>{KIND_SYMBOL[definition.kind]}</span>
      <span className="rarity-mark">{MODULE_RARITIES[definition.meta.rarity].label}</span>
      <span className="module-symbol">{definition.meta.symbol}</span>
      <span className="module-text"><strong>{definition.meta.shortName}</strong><small>{inventoryLabel ?? `${definition.meta.energy} ⚡`}</small></span>
    </button>
  );
}

const TRIGGER_LABEL = { impact: '命中', timer: '延时', proximity: '接近' } as const;

function TriggerNode({ shot, engine }: { shot: ShotBlueprint; engine: GameEngine }) {
  const definition = engine.modules.require(shot.source);
  return (
    <span className="trigger-node-group">
      <span className="trigger-shot" style={{ '--trace-color': definition.meta.color } as CSSProperties}>{definition.meta.shortName}</span>
      {!shot.trigger ? null : (
        <>
          <b className={`trigger-link ${shot.trigger.type}`}>{TRIGGER_LABEL[shot.trigger.type]}⌁</b>
          {shot.payload.map((payload, index) => <TriggerNode key={`${payload.source}-${index}`} shot={payload} engine={engine} />)}
        </>
      )}
    </span>
  );
}

function ProgramReadout({ program, engine, maxEnergy }: { program: TowerProgram; engine: GameEngine; maxEnergy: number }) {
  const capacityWarning = program.shots.length > 0 && program.energyCost > maxEnergy
    ? `本轮需要 ${program.energyCost} 能量，超过该塔 ${maxEnergy} 的能量上限`
    : null;
  const warning = program.warnings[0] ?? capacityWarning;
  const hasTrigger = program.shots.some((shot) => shot.trigger);
  return (
    <div className="program-output">
      <div className={`program-readout ${warning ? 'warning' : ''}`}>
        <span className="readout-icon" aria-hidden="true"><i /></span>
        <div>
          <strong>{program.summary}</strong>
          <small>{warning ?? (program.wraps > 0
            ? '序列末端已回到槽位 1，并额外读取一次法术牌组'
            : hasTrigger
              ? '载荷只在触发条件满足后释放'
              : '程序有效：修正与尾迹会被右侧的下一枚弹射物消耗')}</small>
        </div>
        <span className="energy-cost">{program.energyCost} ⚡</span>
      </div>
      {!hasTrigger ? null : (
        <div className="trigger-trace">
          <small>PAYLOAD</small>
          <div>{program.shots.map((shot, index) => <TriggerNode key={`${shot.source}-${index}`} shot={shot} engine={engine} />)}</div>
        </div>
      )}
    </div>
  );
}

function ModuleInspector({ definition }: { definition: ModuleDefinition }) {
  return (
    <div className="module-inspector" style={variableStyle(definition)}>
      <div className="inspector-symbol">{definition.meta.symbol}</div>
      <div className="inspector-copy">
        <span><i>{KIND_LABEL[definition.kind]}</i><b style={{ color: MODULE_RARITIES[definition.meta.rarity].color }}>{MODULE_RARITIES[definition.meta.rarity].label}</b></span>
        <strong>{definition.meta.name}</strong>
        <small>{definition.meta.description} · {definition.meta.detail}</small>
      </div>
      <div className="inspector-cost"><small>耗能</small><strong>{definition.meta.energy}</strong></div>
    </div>
  );
}

function TowerOverview({ tower, engine }: { tower: Tower; engine: GameEngine }) {
  const color = engine.getTowerColor(tower);
  const energyRatio = tower.maxEnergy > 0
    ? Math.max(0, Math.min(1, tower.energy / tower.maxEnergy))
    : 0;
  const upgradeCost = engine.getTowerUpgradeCost(tower);
  return (
    <>
      <div className="tower-overview" style={{ '--tower-color': color } as CSSProperties}>
        <div className="tower-avatar"><i /><b /><span /></div>
        <div className="tower-title">
          <small>当前节点</small>
          <h3>折射塔 <span>T{String(tower.id).padStart(2, '0')}</span></h3>
          <div className="online"><i />Lv.{tower.level} · 系统在线</div>
        </div>
        <div className="energy-gauge">
          <small>能量</small>
          <strong>{Math.round(tower.energy)}<em>/{tower.maxEnergy}</em></strong>
          <div><i style={{ width: `${energyRatio * 100}%` }} /></div>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-card purple">
          <span className="stat-symbol regen" aria-hidden="true" /><small>能量回复速度</small><strong>{tower.energyRegen}<em> /秒</em></strong>
        </div>
        <div className="stat-card coral">
          <span className="stat-symbol cooldown" aria-hidden="true" /><small>基础冷却时间</small><strong>{tower.cooldown.toFixed(2)}<em> 秒</em></strong>
        </div>
        <div className="stat-card mint">
          <span className="stat-symbol range" aria-hidden="true" /><small>攻击范围</small><strong>{Math.round(tower.range)}<em> 单位</em></strong>
        </div>
        <div className="stat-card amber">
          <span className="stat-symbol slots" aria-hidden="true" /><small>模块槽位</small><strong>{tower.slots.length}<em> 格</em></strong>
        </div>
      </div>
      <div className="tower-controls">
        <label>
          <span>攻击模式</span>
          <select value={tower.targeting} onChange={(event) => engine.setTargeting(event.target.value as TargetingMode)}>
            {TARGETING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button
          onClick={() => engine.upgradeSelectedTower()}
          disabled={upgradeCost === 0 || engine.status === 'wave'}
          title={upgradeCost === 0 ? '已达到最高等级' : '提升容量、回复、冷却与射程；部分等级增加槽位'}
        >
          <span>{upgradeCost === 0 ? 'MAX' : `升级 Lv.${tower.level + 1}`}</span>
          <strong>{upgradeCost === 0 ? '已满级' : `${upgradeCost} ◇`}</strong>
        </button>
      </div>
    </>
  );
}

function CreativeLab({ engine, setup }: { engine: GameEngine; setup: CreativeSetup }) {
  return (
    <section className="creative-lab">
      <div className="section-title">
        <div><span className="step-number">03</span><div><h3>创造模式信号台</h3><small>调整后续波次，或立即投放单个敌人</small></div></div>
      </div>
      <div className="creative-enemy-grid">
        {ENEMY_TYPES.map((type) => {
          const enemy = ENEMIES[type];
          return (
            <div key={type}>
              <span style={{ '--enemy-color': enemy.color } as CSSProperties}><i />{enemy.name}</span>
              <input
                type="number"
                min="0"
                max={enemy.unique ? 1 : 40}
                value={setup.wave[type]}
                onChange={(event) => engine.configureCreativeEnemy(type, Number(event.target.value))}
                aria-label={`${enemy.name}下一波数量`}
              />
              <button onClick={() => engine.spawnCreativeEnemy(type)} title={`立即生成${enemy.name}`}>＋</button>
            </div>
          );
        })}
      </div>
      <div className="creative-scales">
        <label><span>生命倍率</span><input type="range" min="0.25" max="5" step="0.25" value={setup.healthScale} onChange={(event) => engine.configureCreativeScales(Number(event.target.value), setup.speedScale)} /><b>{setup.healthScale.toFixed(2)}×</b></label>
        <label><span>速度倍率</span><input type="range" min="0.25" max="3" step="0.25" value={setup.speedScale} onChange={(event) => engine.configureCreativeScales(setup.healthScale, Number(event.target.value))} /><b>{setup.speedScale.toFixed(2)}×</b></label>
      </div>
    </section>
  );
}

function Workshop({ engine, tower, view }: { engine: GameEngine; tower: Tower; view: GameViewSnapshot }) {
  const { revision } = view;
  const definitions = useMemo(() => engine.getLibraryModules(), [engine, revision]);
  const [selectedModule, setSelectedModule] = useState<ModuleId | null>(() => definitions[0]?.id ?? null);
  const [kindFilter, setKindFilter] = useState<'all' | ModuleKind>('all');
  const visibleDefinitions = useMemo(
    () => kindFilter === 'all'
      ? definitions
      : definitions.filter((definition) => definition.kind === kindFilter),
    [definitions, kindFilter],
  );
  useEffect(() => {
    if (!selectedModule || !visibleDefinitions.some((definition) => definition.id === selectedModule)) {
      setSelectedModule(visibleDefinitions[0]?.id ?? null);
    }
  }, [selectedModule, visibleDefinitions]);
  const selectedDefinition = selectedModule
    ? definitions.find((definition) => definition.id === selectedModule)
    : undefined;
  const filterLabel = kindFilter === 'all' ? '全部模块' : KIND_LABEL[kindFilter];
  const program = view.selectedProgram ?? engine.modules.compile(tower.slots);

  const quickInstall = (id: ModuleId): void => {
    const empty = tower.slots.findIndex((slot) => slot === null);
    if (empty >= 0) engine.installModule(empty, id);
  };

  return (
    <aside className="workshop" data-mode={engine.mode} aria-label="炮塔模块工作台">
      <div className="workshop-head">
        <h2>ARC WORKSHOP <span>弧光工作台</span></h2>
        <div className="workshop-head-actions">
          <div className="tower-id">NODE T{String(tower.id).padStart(2, '0')}</div>
          <button className="workshop-close" onClick={() => engine.selectTower(null)} aria-label="关闭工作台">×</button>
        </div>
      </div>

      <div className="workshop-body">
        <div className="workshop-side">
          <TowerOverview tower={tower} engine={engine} />
          {selectedDefinition ? <ModuleInspector definition={selectedDefinition} /> : null}
        </div>

        <div className="workshop-main">
          <section className="program-section">
            <div className="section-title">
              <div><span className="step-number">01</span><div><h3>编排施法序列</h3><small>从左到右 · {tower.slots.length} 槽</small></div></div>
              <button onClick={() => engine.clearLoadout()}>清空</button>
            </div>
            <div className="slot-flow" style={{ '--slot-count': tower.slots.length } as CSSProperties}>
              {tower.slots.map((moduleId, index) => (
                <ModuleSlot
                  key={index}
                  index={index}
                  isLast={index === tower.slots.length - 1}
                  definition={moduleId ? engine.modules.get(moduleId) : undefined}
                  selectedModule={selectedModule}
                  engine={engine}
                />
              ))}
            </div>
            <ProgramReadout program={program} engine={engine} maxEnergy={tower.maxEnergy} />
          </section>

          <section className="library-section">
            <div className="section-title library-title">
              <div><span className="step-number">02</span><div><h3>{filterLabel} · {visibleDefinitions.length}</h3><small>选择后点击槽位安装</small></div></div>
              <div className="module-filters" aria-label="模块类型筛选">
                {([
                  ['all', 'ALL'],
                  ['projectile', KIND_LABEL.projectile],
                  ['static', KIND_LABEL.static],
                  ['modifier', KIND_LABEL.modifier],
                  ['trail', KIND_LABEL.trail],
                  ['logic', KIND_LABEL.logic],
                ] as const).map(([kind, label]) => (
                  <button key={kind} className={kindFilter === kind ? `active ${kind}` : kind} onClick={() => setKindFilter(kind)}>{label}</button>
                ))}
              </div>
            </div>
            <div className={`module-grid ${kindFilter === 'all' ? 'all-modules' : ''}`}>
              {visibleDefinitions.map((definition) => {
                const counts = view.moduleInventory[definition.id];
                const available = counts?.available ?? 0;
                const total = counts?.total ?? 0;
                const exhausted = engine.mode === 'standard' && available === 0;
                return (
                  <ModuleCard
                    key={definition.id}
                    definition={definition}
                    selected={definition.id === selectedModule}
                    exhausted={exhausted}
                    inventoryLabel={engine.mode === 'standard'
                      ? exhausted ? `已用完 · 共 ${total}` : `可用 ${available} / ${total}`
                      : undefined}
                    onSelect={() => setSelectedModule(definition.id)}
                    onQuickInstall={() => quickInstall(definition.id)}
                  />
                );
              })}
              {visibleDefinitions.length === 0 ? (
                <div className="module-library-empty">尚未拥有{filterLabel}</div>
              ) : null}
            </div>
          </section>
        </div>

        {engine.mode === 'creative' ? <CreativeLab engine={engine} setup={view.creativeSetup} /> : null}
      </div>
    </aside>
  );
}

function Toast({ toast }: { toast: ToastState | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  return <div className={`toast ${visible ? 'visible' : ''}`} data-tone={toast?.tone ?? 'info'} role="status" aria-live="polite">{toast?.message}</div>;
}

function RewardDraft({ engine, snapshot, inventory }: { engine: GameEngine; snapshot: GameSnapshot; inventory: GameViewSnapshot['moduleInventory'] }) {
  const draft = snapshot.draft;
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!draft) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previousFocus?.focus();
  }, [draft?.round]);
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  if (!draft) return null;
  return (
    <div className="reward-backdrop" role="dialog" aria-modal="true" aria-label="选择模块奖励">
      <div className="reward-panel" ref={panelRef} onKeyDown={trapFocus}>
        <div className="reward-kicker">WAVE {String(snapshot.wave).padStart(2, '0')} CLEARED</div>
        <h2>截获模块信号</h2>
        <p>四选一，选择一枚加入库存。</p>
        <div className="reward-progress">
          {Array.from({ length: draft.totalRounds }, (_, index) => <i key={index} className={index < draft.round ? 'active' : ''} />)}
          <span>{draft.round} / {draft.totalRounds}</span>
        </div>
        <div className="reward-grid">
          {draft.choices.map((moduleId) => {
            const definition = engine.modules.require(moduleId);
            return (
              <button key={moduleId} className={`reward-card rarity-${definition.meta.rarity}`} style={variableStyle(definition)} onClick={() => engine.chooseDraftModule(moduleId)}>
                <span className={`reward-kind ${definition.kind}`}>{MODULE_RARITIES[definition.meta.rarity].label} · {KIND_LABEL[definition.kind]}</span>
                <b>{definition.meta.symbol}</b>
                <strong>{definition.meta.name}</strong>
                <small>{definition.meta.description}</small>
                <em>{definition.meta.energy} ⚡ · 已有 {inventory[moduleId]?.total ?? 0}</em>
              </button>
            );
          })}
        </div>
        <div className="reward-foot">每次只能选择一个 · 还需选择 {draft.totalRounds - draft.round + 1} 次</div>
      </div>
    </div>
  );
}

const initialCreativeSetup = (): CreativeSetup => ({
  wave: { spark: 8, kite: 5, block: 2, hex: 1, crown: 0 },
  healthScale: 1,
  speedScale: 1,
});

function LevelMap({ level }: { level: LevelDefinition }) {
  return (
    <svg className="level-map" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} aria-hidden="true">
      <polyline points={level.path.map((point) => `${point.x},${point.y}`).join(' ')} />
      {level.towerPads.map((pad, index) => <circle key={index} cx={pad.x} cy={pad.y} r="17" />)}
    </svg>
  );
}

function LevelSelect({ onStart }: { onStart: (levelId: string, mode: GameMode, creative: CreativeSetup, difficultyId: DifficultyId) => void }) {
  const [levelId, setLevelId] = useState<string>(DEFAULT_LEVEL_ID);
  const [mode, setMode] = useState<GameMode>('standard');
  const [difficultyId, setDifficultyId] = useState<DifficultyId>(DEFAULT_DIFFICULTY_ID);
  const [creative, setCreative] = useState<CreativeSetup>(initialCreativeSetup);
  const selectedLevel = getLevel(levelId);
  const selectedDifficulty = getDifficulty(difficultyId);
  const setEnemyCount = (type: EnemyType, count: number): void => setCreative((current) => ({
    ...current,
    wave: { ...current.wave, [type]: Math.max(0, Math.min(40, Math.round(count))) },
  }));

  return (
    <main className="level-select-shell">
      <header className="level-select-head">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><i /><b /><span /></div>
          <div><div className="brand-name">PRISM <span>BASTION</span></div><div className="brand-sub">MODULAR DEFENSE NETWORK</div></div>
        </div>
        <section className="level-select-intro">
          <div><span>SELECT SIGNAL SECTOR</span><h1>选择防御区</h1><p>不同路径会改变密度、覆盖范围与目标策略的价值。</p></div>
        </section>
        <div className="mode-selector" role="group" aria-label="游戏模式">
          <button className={mode === 'standard' ? 'active' : ''} onClick={() => setMode('standard')}><strong>正式模式</strong><small>选牌 · 库存</small></button>
          <button className={mode === 'creative' ? 'active' : ''} onClick={() => setMode('creative')}><strong>创造模式</strong><small>无限模块</small></button>
        </div>
        <button className="begin-run" onClick={() => onStart(levelId, mode, creative, difficultyId)}><span>{selectedDifficulty.name} · 部署至</span><strong>{selectedLevel.name} →</strong></button>
      </header>

      <section className="difficulty-select" aria-label="难度修正">
        <div className="difficulty-select-head">
          <div><span>NUMERIC DIFFICULTY</span><strong>难度修正</strong></div>
        </div>
        <div className="difficulty-options" role="radiogroup" aria-label="选择难度">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty.id}
              className={difficulty.id === difficultyId ? 'selected' : ''}
              data-rank={difficulty.rank}
              role="radio"
              aria-checked={difficulty.id === difficultyId}
              onClick={() => setDifficultyId(difficulty.id)}
            >
              <span>{difficulty.rank < 0 ? '◇'.repeat(-difficulty.rank) : difficulty.rank > 0 ? '◆'.repeat(difficulty.rank) : '—'}</span>
              <strong>{difficulty.name}</strong>
              <small>{DIFFICULTY_TONE[difficulty.id]}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="level-grid">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            className={`level-card ${level.id === levelId ? 'selected' : ''}`}
            style={{ '--level-accent': level.accent } as CSSProperties}
            onClick={() => setLevelId(level.id)}
          >
            <div className="level-map-wrap"><LevelMap level={level} /><span>{level.sector}</span></div>
            <div className="level-card-copy">
              <div><small>{'◆'.repeat(level.difficulty)}{'◇'.repeat(3 - level.difficulty)}</small><b>{level.waves.length} 波</b></div>
              <h2>{level.name}</h2>
              <p>{level.description}</p>
              <footer><span>{level.towerPads.length} 个炮塔节点</span></footer>
            </div>
          </button>
        ))}
      </section>

      {mode !== 'creative' ? (
        <section className="standard-brief">
          <strong>正式模式规则</strong>
          <span>起始仅持有脉冲与冷凝模块</span><i />
          <span>每波后进行 3 次四选一</span><i />
          <span>模块份数限制同时装配数量</span>
        </section>
      ) : (
        <section className="creative-setup-card">
          <div><span>CREATIVE SIGNAL MIXER</span><h2>自定义重复波次</h2><p>这些参数仍可在游戏中随时修改。</p></div>
          <div className="setup-enemies">
            {ENEMY_TYPES.map((type) => <label key={type}><span style={{ '--enemy-color': ENEMIES[type].color } as CSSProperties}><i />{ENEMIES[type].name}</span><input type="number" min="0" max={ENEMIES[type].unique ? 1 : 40} value={creative.wave[type]} onChange={(event) => setEnemyCount(type, Number(event.target.value))} /></label>)}
          </div>
          <div className="setup-scales">
            <label><span>生命倍率</span><input type="range" min="0.25" max="5" step="0.25" value={creative.healthScale} onChange={(event) => setCreative((current) => ({ ...current, healthScale: Number(event.target.value) }))} /><b>{creative.healthScale.toFixed(2)}×</b></label>
            <label><span>速度倍率</span><input type="range" min="0.25" max="3" step="0.25" value={creative.speedScale} onChange={(event) => setCreative((current) => ({ ...current, speedScale: Number(event.target.value) }))} /><b>{creative.speedScale.toFixed(2)}×</b></label>
          </div>
        </section>
      )}
    </main>
  );
}

function GameSession({ engine, onExit }: { engine: GameEngine; onExit: () => void }) {
  const { view, toast } = useGameState(engine);
  const { game: snapshot, selectedTower: tower } = view;
  return (
    <div className="app-shell">
      <Header engine={engine} snapshot={snapshot} onExit={onExit} />
      <div className="workspace">
        <Battlefield engine={engine} view={view} />
        {tower ? <Workshop engine={engine} tower={tower} view={view} /> : null}
      </div>
      <RewardDraft engine={engine} snapshot={snapshot} inventory={view.moduleInventory} />
      <Toast toast={toast} />
    </div>
  );
}

export function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  if (!engine) {
    return <LevelSelect onStart={(levelId, mode, creative, difficultyId) => setEngine(new GameEngine({ levelId, mode, creative, difficultyId }))} />;
  }
  return <GameSession engine={engine} onExit={() => setEngine(null)} />;
}
