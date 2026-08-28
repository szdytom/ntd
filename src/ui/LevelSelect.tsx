import type { CSSProperties, KeyboardEvent } from 'react';
import { useState } from 'react';
import { DEFAULT_LEVEL_ID, ENEMIES, getLevel, LEVELS } from '../game/config';
import { DEFAULT_DIFFICULTY_ID, DIFFICULTIES, getDifficulty } from '../game/difficulty';
import type { CreativeSetup, DifficultyId, EnemyType, GameMode } from '../game/types';
import { LevelMap } from './LevelMap';
import './LevelSelect.css';

const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'kite', 'block', 'hex', 'crown'];
const DIFFICULTY_TONE: Record<DifficultyId, string> = {
  relaxed: '最轻松',
  easy: '较轻松',
  normal: '推荐',
  hard: '更困难',
  extreme: '最困难',
};

const initialCreativeSetup = (): CreativeSetup => ({
  wave: { spark: 8, kite: 5, block: 2, hex: 1, crown: 0 },
  healthScale: 1,
  speedScale: 1,
});

export interface LevelSelection {
  levelId: string;
  mode: GameMode;
  creative: CreativeSetup;
  difficultyId: DifficultyId;
}

export function LevelSelect({ onStart }: { onStart: (selection: LevelSelection) => void }) {
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
  const focusSelectedOption = (element: HTMLElement): void => {
    const group = element.parentElement;
    requestAnimationFrame(() => group?.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
  };
  const cycleDifficulty = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const next = DIFFICULTIES[(index + offset + DIFFICULTIES.length) % DIFFICULTIES.length];
    if (!next) return;
    setDifficultyId(next.id);
    focusSelectedOption(event.currentTarget);
  };
  const cycleLevel = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const next = LEVELS[(index + offset + LEVELS.length) % LEVELS.length];
    if (!next) return;
    setLevelId(next.id);
    focusSelectedOption(event.currentTarget);
  };

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
          <button aria-pressed={mode === 'standard'} className={mode === 'standard' ? 'active' : ''} onClick={() => setMode('standard')}><strong>正式模式</strong><small>选牌 · 库存</small></button>
          <button aria-pressed={mode === 'creative'} className={mode === 'creative' ? 'active' : ''} onClick={() => setMode('creative')}><strong>创造模式</strong><small>无限模块</small></button>
        </div>
        <button className="begin-run" onClick={() => onStart({ levelId, mode, creative, difficultyId })}><span>{selectedDifficulty.name} · 部署至</span><strong>{selectedLevel.name} →</strong></button>
      </header>

      <section className="difficulty-select" aria-label="难度修正">
        <div className="difficulty-select-head">
          <div><span>NUMERIC DIFFICULTY</span><strong>难度修正</strong></div>
        </div>
        <div className="difficulty-options" role="radiogroup" aria-label="选择难度">
          {DIFFICULTIES.map((difficulty, index) => (
            <button
              key={difficulty.id}
              className={difficulty.id === difficultyId ? 'selected' : ''}
              data-rank={difficulty.rank}
              role="radio"
              aria-checked={difficulty.id === difficultyId}
              tabIndex={difficulty.id === difficultyId ? 0 : -1}
              onKeyDown={(event) => cycleDifficulty(event, index)}
              onClick={() => setDifficultyId(difficulty.id)}
            >
              <span>{difficulty.rank < 0 ? '◇'.repeat(-difficulty.rank) : difficulty.rank > 0 ? '◆'.repeat(difficulty.rank) : '—'}</span>
              <strong>{difficulty.name}</strong>
              <small>{DIFFICULTY_TONE[difficulty.id]}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="level-grid" role="radiogroup" aria-label="选择防御区">
        {LEVELS.map((level, index) => (
          <button
            key={level.id}
            className={`level-card ${level.id === levelId ? 'selected' : ''}`}
            style={{ '--level-accent': level.accent } as CSSProperties}
            role="radio"
            aria-checked={level.id === levelId}
            tabIndex={level.id === levelId ? 0 : -1}
            onKeyDown={(event) => cycleLevel(event, index)}
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
