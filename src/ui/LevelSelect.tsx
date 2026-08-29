import type { CSSProperties, KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LEVEL_ID, ENEMIES, getLevel, LEVELS } from '../game/config';
import { DEFAULT_DIFFICULTY_ID, DIFFICULTIES, getDifficulty } from '../game/difficulty';
import type { CreativeSetup, DifficultyId, EnemyType, GameMode } from '../game/types';
import { difficultyName, enemyName, levelDescription, levelName } from '../i18n/presentation';
import { LevelMap } from './LevelMap';
import './LevelSelect.css';

const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'kite', 'block', 'hex', 'crown', 'fracture', 'radiant'];
const VISIBLE_LEVEL_COUNT = 3;
const initialCreativeSetup = (): CreativeSetup => ({
  wave: { spark: 8, kite: 5, block: 2, hex: 1, crown: 0, fracture: 0, radiant: 0 },
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
  const { t } = useTranslation();
  const [levelId, setLevelId] = useState<string>(DEFAULT_LEVEL_ID);
  const [mode, setMode] = useState<GameMode>('standard');
  const [difficultyId, setDifficultyId] = useState<DifficultyId>(DEFAULT_DIFFICULTY_ID);
  const [creative, setCreative] = useState<CreativeSetup>(initialCreativeSetup);
  const [carouselStart, setCarouselStart] = useState(0);
  const [carouselDirection, setCarouselDirection] = useState<'next' | 'previous' | null>(null);
  const selectedLevel = getLevel(levelId);
  const selectedDifficulty = getDifficulty(difficultyId);
  const maximumCarouselStart = Math.max(0, LEVELS.length - VISIBLE_LEVEL_COUNT);
  const visibleLevels = LEVELS.slice(carouselStart, carouselStart + VISIBLE_LEVEL_COUNT);
  const setEnemyCount = (type: EnemyType, count: number): void => setCreative((current) => ({
    ...current,
    wave: { ...current.wave, [type]: Math.max(0, Math.min(40, Math.round(count))) },
  }));
  const focusSelectedOption = (element: HTMLElement): void => {
    const group = element.parentElement;
    requestAnimationFrame(() => {
      if (!group?.contains(document.activeElement)) return;
      group.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    });
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
    const nextIndex = LEVELS.indexOf(next);
    if (nextIndex < carouselStart) {
      setCarouselDirection('previous');
      setCarouselStart(nextIndex);
    }
    else if (nextIndex >= carouselStart + VISIBLE_LEVEL_COUNT) {
      setCarouselDirection('next');
      setCarouselStart(Math.min(maximumCarouselStart, nextIndex - VISIBLE_LEVEL_COUNT + 1));
    }
    focusSelectedOption(event.currentTarget);
  };
  const moveCarousel = (offset: number): void => {
    const nextStart = Math.max(0, Math.min(maximumCarouselStart, carouselStart + offset));
    if (nextStart === carouselStart) return;
    setCarouselDirection(offset > 0 ? 'next' : 'previous');
    setCarouselStart(nextStart);
    const selectedIndex = LEVELS.findIndex((level) => level.id === levelId);
    if (selectedIndex < nextStart || selectedIndex >= nextStart + VISIBLE_LEVEL_COUNT) {
      const nextSelection = LEVELS[nextStart];
      if (nextSelection) setLevelId(nextSelection.id);
    }
  };

  return (
    <main className="level-select-shell">
      <header className="level-select-head">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><i /><b /><span /></div>
          <div><div className="brand-name">PRISM <span>BASTION</span></div><div className="brand-sub">MODULAR DEFENSE NETWORK</div></div>
        </div>
        <section className="level-select-intro">
          <div><span>{t('levelSelect.eyebrow')}</span><h1>{t('levelSelect.title')}</h1><p>{t('levelSelect.intro')}</p></div>
        </section>
        <div className="mode-selector" role="group" aria-label={t('levelSelect.modeLabel')}>
          <button aria-pressed={mode === 'standard'} className={mode === 'standard' ? 'active' : ''} onClick={() => setMode('standard')}><strong>{t('levelSelect.standardTitle')}</strong><small>{t('levelSelect.standardDetail')}</small></button>
          <button aria-pressed={mode === 'creative'} className={mode === 'creative' ? 'active' : ''} onClick={() => setMode('creative')}><strong>{t('levelSelect.creativeTitle')}</strong><small>{t('levelSelect.creativeDetail')}</small></button>
        </div>
        <button className="begin-run" onClick={() => onStart({ levelId, mode, creative, difficultyId })}><span>{t('levelSelect.deployTo', { difficulty: difficultyName(t, selectedDifficulty.id) })}</span><strong>{levelName(t, selectedLevel.id)} →</strong></button>
      </header>

      <section className="difficulty-select" aria-label={t('levelSelect.difficultyLabel')}>
        <div className="difficulty-select-head">
          <div><span>{t('levelSelect.difficultyEyebrow')}</span><strong>{t('levelSelect.difficultyHeading')}</strong></div>
        </div>
        <div className="difficulty-options" role="radiogroup" aria-label={t('levelSelect.chooseDifficulty')}>
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
              <strong>{difficultyName(t, difficulty.id)}</strong>
              <small>{t(`difficulties.${difficulty.id}.tone`)}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="level-carousel">
        <button className="level-carousel-arrow previous" onClick={() => moveCarousel(-1)} disabled={carouselStart === 0} aria-label={t('levelSelect.previousLevels')} />
        <section key={carouselStart} className={`level-grid ${carouselDirection ? `slide-${carouselDirection}` : ''}`} role="radiogroup" aria-label={t('levelSelect.chooseLevel')}>
        {visibleLevels.map((level, visibleIndex) => {
          const index = carouselStart + visibleIndex;
          return (
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
              <div><small>{'◆'.repeat(level.difficulty)}{'◇'.repeat(3 - level.difficulty)}</small><b>{t('levelSelect.waves', { count: level.waves.length })}</b></div>
              <h2>{levelName(t, level.id)}</h2>
              <p>{levelDescription(t, level.id)}</p>
              <footer><span>{t('levelSelect.towerNodes', { count: level.towerPads.length })}</span></footer>
            </div>
          </button>
          );
        })}
        </section>
        <button className="level-carousel-arrow next" onClick={() => moveCarousel(1)} disabled={carouselStart === maximumCarouselStart} aria-label={t('levelSelect.nextLevels')} />
      </div>

      {mode !== 'creative' ? (
        <section className="standard-brief">
          <strong>{t('levelSelect.standardRules')}</strong>
          <span>{t('levelSelect.ruleStarting')}</span><i />
          <span>{t('levelSelect.ruleDraft')}</span><i />
          <span>{t('levelSelect.ruleInventory')}</span>
        </section>
      ) : (
        <section className="creative-setup-card">
          <div><span>{t('levelSelect.creativeEyebrow')}</span><h2>{t('levelSelect.creativeHeading')}</h2><p>{t('levelSelect.creativeDescription')}</p></div>
          <div className="setup-enemies">
            {ENEMY_TYPES.map((type) => <label key={type}><span style={{ '--enemy-color': ENEMIES[type].color } as CSSProperties}><i className={ENEMIES[type].shape === 'star' ? 'star' : ENEMIES[type].shape === 'ring' ? 'ring' : ''} />{enemyName(t, type)}</span><input type="number" min="0" max="40" value={creative.wave[type]} onChange={(event) => setEnemyCount(type, Number(event.target.value))} /></label>)}
          </div>
          <div className="setup-scales">
            <label><span>{t('levelSelect.healthScale')}</span><input type="range" min="0.25" max="5" step="0.25" value={creative.healthScale} onChange={(event) => setCreative((current) => ({ ...current, healthScale: Number(event.target.value) }))} /><b>{creative.healthScale.toFixed(2)}×</b></label>
            <label><span>{t('levelSelect.speedScale')}</span><input type="range" min="0.25" max="3" step="0.25" value={creative.speedScale} onChange={(event) => setCreative((current) => ({ ...current, speedScale: Number(event.target.value) }))} /><b>{creative.speedScale.toFixed(2)}×</b></label>
          </div>
        </section>
      )}
    </main>
  );
}
