import type { CSSProperties, KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BUILD_COMMIT, BUILD_COMMIT_DATE } from '../build-info';
import { DEFAULT_LEVEL_ID, getLevel, LEVELS } from '../game/config';
import { DEFAULT_DIFFICULTY_ID, DIFFICULTIES, getDifficulty } from '../game/difficulty';
import type { CreativeSetup, DifficultyId, GameMode } from '../game/types';
import { difficultyName, levelDescription, levelName } from '../i18n/presentation';
import { SIGNAL_IDS, signalRegistry } from '../signals';
import { CalibrationSlider } from './CalibrationSlider';
import { LevelMap } from './LevelMap';
import { MobileFullscreenButton } from './MobileFullscreenButton';
import { SettingsPanel } from './SettingsPanel';
import { Tag } from './Tag';
import './LevelSelect.css';

const DESKTOP_VISIBLE_LEVEL_COUNT = 3;
const COMPACT_VISIBLE_LEVEL_COUNT = 1;
const COMPACT_LEVEL_QUERY = '(max-width: 980px)';
export const LEVEL_SELECTION_STORAGE_KEY = 'prism-bastion-level-selection';
const visibleLevelCountForViewport = (): number => globalThis.matchMedia?.(COMPACT_LEVEL_QUERY).matches
  ? COMPACT_VISIBLE_LEVEL_COUNT
  : DESKTOP_VISIBLE_LEVEL_COUNT;
const positiveInteger = (value: number, fallback: number): number => Number.isFinite(value)
  ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value)))
  : fallback;
const initialCreativeSetup = (levelId: string): CreativeSetup => ({
  healthScale: 1,
  speedScale: 1,
  coreStability: 20,
  waveCount: getLevel(levelId).waves.length,
});

interface RememberedLevelSelection {
  levelId: string;
  mode: GameMode;
  difficultyId: DifficultyId;
}

const isGameMode = (value: unknown): value is GameMode => value === 'standard' || value === 'creative';
const isDifficultyId = (value: unknown): value is DifficultyId => DIFFICULTIES.some((difficulty) => difficulty.id === value);
const isLevelId = (value: unknown): value is string => LEVELS.some((level) => level.id === value);

const readRememberedSelection = (): RememberedLevelSelection | null => {
  try {
    const raw = globalThis.localStorage?.getItem(LEVEL_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const selection = parsed as Record<string, unknown>;
    if (!isLevelId(selection.levelId) || !isGameMode(selection.mode) || !isDifficultyId(selection.difficultyId)) return null;
    return {
      levelId: selection.levelId,
      mode: selection.mode,
      difficultyId: selection.difficultyId,
    };
  } catch {
    return null;
  }
};

const rememberSelection = (selection: RememberedLevelSelection): void => {
  try {
    globalThis.localStorage?.setItem(LEVEL_SELECTION_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
};

export interface LevelSelection {
  levelId: string;
  mode: GameMode;
  creative: CreativeSetup;
  difficultyId: DifficultyId;
}

export function LevelSelect({ onStart, onOpenArchive, onOpenDefenseArchive, onOpenThought }: {
  onStart: (selection: LevelSelection) => void;
  onOpenArchive: () => void;
  onOpenDefenseArchive: () => void;
  onOpenThought: () => void;
}) {
  const { t } = useTranslation();
  const [rememberedSelection] = useState(readRememberedSelection);
  const [levelId, setLevelId] = useState<string>(rememberedSelection?.levelId ?? DEFAULT_LEVEL_ID);
  const [mode, setMode] = useState<GameMode>(rememberedSelection?.mode ?? 'standard');
  const [difficultyId, setDifficultyId] = useState<DifficultyId>(rememberedSelection?.difficultyId ?? DEFAULT_DIFFICULTY_ID);
  const [creative, setCreative] = useState<CreativeSetup>(() => initialCreativeSetup(rememberedSelection?.levelId ?? DEFAULT_LEVEL_ID));
  const [visibleLevelCount, setVisibleLevelCount] = useState(visibleLevelCountForViewport);
  const [carouselStart, setCarouselStart] = useState(() => {
    const selectedIndex = Math.max(0, LEVELS.findIndex((level) => level.id === (rememberedSelection?.levelId ?? DEFAULT_LEVEL_ID)));
    if (visibleLevelCount === COMPACT_VISIBLE_LEVEL_COUNT) return selectedIndex;
    return Math.min(Math.max(0, selectedIndex - Math.floor(visibleLevelCount / 2)), Math.max(0, LEVELS.length - visibleLevelCount));
  });
  const [carouselDirection, setCarouselDirection] = useState<'next' | 'previous' | null>(null);
  const selectedLevel = getLevel(levelId);
  const selectedDifficulty = getDifficulty(difficultyId);
  useEffect(() => {
    rememberSelection({ levelId, mode, difficultyId });
  }, [difficultyId, levelId, mode]);
  const maximumCarouselStart = Math.max(0, LEVELS.length - visibleLevelCount);
  const visibleLevels = LEVELS.slice(carouselStart, carouselStart + visibleLevelCount);
  useEffect(() => {
    const mediaQuery = globalThis.matchMedia?.(COMPACT_LEVEL_QUERY);
    if (!mediaQuery) return;
    const updateVisibleLevelCount = (event: MediaQueryListEvent): void => {
      const nextCount = event.matches ? COMPACT_VISIBLE_LEVEL_COUNT : DESKTOP_VISIBLE_LEVEL_COUNT;
      setVisibleLevelCount(nextCount);
      setCarouselStart((current) => {
        const maximumStart = Math.max(0, LEVELS.length - nextCount);
        if (nextCount !== COMPACT_VISIBLE_LEVEL_COUNT) return Math.min(current, maximumStart);
        const selectedIndex = LEVELS.findIndex((level) => level.id === levelId);
        return selectedIndex < 0 ? Math.min(current, maximumStart) : selectedIndex;
      });
      setCarouselDirection(null);
    };
    mediaQuery.addEventListener('change', updateVisibleLevelCount);
    return () => mediaQuery.removeEventListener('change', updateVisibleLevelCount);
  }, [levelId]);
  const selectLevel = (nextLevelId: string, center = true): void => {
    setLevelId(nextLevelId);
    setCreative((current) => ({ ...current, waveCount: getLevel(nextLevelId).waves.length }));
    if (!center) return;
    const nextIndex = LEVELS.findIndex((level) => level.id === nextLevelId);
    if (nextIndex < 0) return;
    const centeredStart = visibleLevelCount === COMPACT_VISIBLE_LEVEL_COUNT
      ? nextIndex
      : nextIndex - Math.floor(visibleLevelCount / 2);
    const nextStart = Math.max(0, Math.min(maximumCarouselStart, centeredStart));
    if (nextStart === carouselStart) return;
    setCarouselDirection(nextStart > carouselStart ? 'next' : 'previous');
    setCarouselStart(nextStart);
  };
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
    selectLevel(next.id);
    focusSelectedOption(event.currentTarget);
  };
  const moveCarousel = (offset: number): void => {
    const nextStart = Math.max(0, Math.min(maximumCarouselStart, carouselStart + offset));
    if (nextStart === carouselStart) return;
    setCarouselDirection(offset > 0 ? 'next' : 'previous');
    setCarouselStart(nextStart);
    const selectedIndex = LEVELS.findIndex((level) => level.id === levelId);
    if (selectedIndex < nextStart || selectedIndex >= nextStart + visibleLevelCount) {
      const nextSelection = LEVELS[nextStart];
      if (nextSelection) selectLevel(nextSelection.id, false);
    }
  };

  return (
    <main className="level-select-shell">
      <div className="level-select-frame">
      <header className="level-select-head">
        <section className="level-select-intro">
          <h1>{t('levelSelect.gameTitle')}</h1>
        </section>
        <button className="begin-run" onClick={() => onStart({ levelId, mode, creative, difficultyId })}>
          <span>
            <small>{mode === 'creative' ? t('levelSelect.creativeTitle') : difficultyName(t, selectedDifficulty.id)} · {levelName(t, selectedLevel.id)}</small>
            <strong>{t('levelSelect.startAction')}</strong>
          </span>
          <b aria-hidden="true">→</b>
        </button>
      </header>

      <section className="mission-controls" aria-label={t('levelSelect.missionSetup')}>
        <div className="mode-selector" role="group" aria-label={t('levelSelect.modeLabel')}>
          <button aria-pressed={mode === 'standard'} className={mode === 'standard' ? 'active' : ''} onClick={() => setMode('standard')}><strong>{t('levelSelect.standardTitle')}</strong><small>{t('levelSelect.standardDetail')}</small></button>
          <button aria-pressed={mode === 'creative'} className={mode === 'creative' ? 'active' : ''} onClick={() => setMode('creative')}><strong>{t('levelSelect.creativeTitle')}</strong><small>{t('levelSelect.creativeDetail')}</small></button>
        </div>

        <section className="difficulty-select" aria-label={t('levelSelect.difficultyLabel')}>
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
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="sector-selection" aria-label={t('levelSelect.chooseLevel')}>
        <header className="selection-section-head">
          <div className="selection-heading-copy">
            <strong>{t('levelSelect.sectorSelectionHeading')}</strong>
            <span>{t('levelSelect.sectorHint')}</span>
          </div>
          <div className="level-select-utilities">
            <button className="thought-index-entry" onClick={onOpenThought} aria-label={t('thoughtIndex.entryAria')}>
              <span className="thought-index-entry-trace" aria-hidden="true"><i /><i /><i /></span>
              <strong>{t('thoughtIndex.entry')}</strong>
            </button>
            <button className="defense-archive-entry" onClick={onOpenDefenseArchive} aria-label={t('defenseArchive.entryAria')}>
              <span className="defense-archive-entry-marks" aria-hidden="true">
                <svg viewBox="0 0 44 30">
                  <path className="defense-archive-sheet back" d="M8 1.5h25l8 8v16H8z" />
                  <path className="defense-archive-sheet middle" d="M4.5 4.5h25l8 8v16h-33z" />
                  <path className="defense-archive-sheet front" d="M1.5 7.5h25l8 8v13h-33z" />
                  <path className="defense-archive-index" d="M6 12v12" />
                  <path className="defense-archive-data primary" d="M12 13.5h11" />
                  <path className="defense-archive-data secondary" d="M12 18h16" />
                  <path className="defense-archive-data tertiary" d="M12 22.5h8" />
                </svg>
              </span>
              <strong>{t('defenseArchive.entry')}</strong>
            </button>
            <button className="signal-archive-entry" onClick={onOpenArchive} aria-label={t('signalArchive.entryAria')}>
              <span className="signal-archive-entry-spectrum" aria-hidden="true">
                {SIGNAL_IDS.map((type) => <i key={type} style={{ '--signal-color': signalRegistry.require(type).visual.color } as CSSProperties} />)}
              </span>
              <strong>{t('signalArchive.entry')}</strong>
            </button>
            <MobileFullscreenButton />
            <SettingsPanel />
          </div>
        </header>
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
            onClick={() => selectLevel(level.id)}
          >
            <div className="level-map-wrap"><LevelMap level={level} /><Tag className="level-sector-tag" tone="accent" monospace>{level.sector.replace('SECTOR ', '')}</Tag></div>
            <div className="level-card-copy">
              <div><small>{'◆'.repeat(level.difficulty)}{'◇'.repeat(3 - level.difficulty)}</small><b>{t('levelSelect.waves', { count: level.waves.length })}</b></div>
              <h2>{levelName(t, level.id)}</h2>
              <p>{levelDescription(t, level.id)}</p>
              <footer><Tag>{t('levelSelect.towerNodes', { count: level.towerPads.length })}</Tag></footer>
            </div>
          </button>
          );
        })}
        </section>
        <button className="level-carousel-arrow next" onClick={() => moveCarousel(1)} disabled={carouselStart === maximumCarouselStart} aria-label={t('levelSelect.nextLevels')} />
        </div>
      </section>

      {mode === 'creative' ? (
        <section className="creative-setup-card">
          <div className="creative-setup-title"><h2>{t('levelSelect.creativeHeading')}</h2></div>
          <div className="setup-rules">
            <label className="core-rule">
              <span>{t('levelSelect.coreStability')}</span>
              <div><input aria-label={t('levelSelect.coreStability')} type="number" min="1" value={creative.coreStability} onChange={(event) => {
                const value = Number(event.currentTarget.value);
                setCreative((current) => ({ ...current, coreStability: positiveInteger(value, current.coreStability) }));
              }} /><b>♥</b></div>
            </label>
            <label className="wave-rule">
              <span>{t('levelSelect.waveCount')}</span>
              <div><input aria-label={t('levelSelect.waveCount')} type="number" min="1" value={creative.waveCount} onChange={(event) => {
                const value = Number(event.currentTarget.value);
                setCreative((current) => ({ ...current, waveCount: positiveInteger(value, current.waveCount) }));
              }} /><b>≋</b></div>
            </label>
          </div>
          <div className="setup-scales">
            <CalibrationSlider label={t('levelSelect.healthScale')} min={0.25} max={5} step={0.25} value={creative.healthScale} onChange={(value) => setCreative((current) => ({ ...current, healthScale: value }))} />
            <CalibrationSlider label={t('levelSelect.speedScale')} min={0.25} max={3} step={0.25} value={creative.speedScale} onChange={(value) => setCreative((current) => ({ ...current, speedScale: value }))} />
          </div>
        </section>
      ) : null}
      </div>
      <footer className="home-meta">
        <span>{t('levelSelect.version', { date: BUILD_COMMIT_DATE })}</span>
        <a href={`https://github.com/szdytom/ntd/commit/${BUILD_COMMIT}`} target="_blank" rel="noreferrer">{BUILD_COMMIT}</a>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/szdytom/ntd" target="_blank" rel="noreferrer">{t('levelSelect.projectOpenSource')}</a>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/szdytom/ntd" target="_blank" rel="noreferrer">{t('levelSelect.starRequest')}</a>
      </footer>
    </main>
  );
}
