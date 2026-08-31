import { LEVELS } from '../game/config';
import { DIFFICULTIES } from '../game/difficulty';
import type { DifficultyId, EnemyType, DefenseArchiveFact } from '../game/types';
import type {
  AchievementDefinition,
  AchievementProgress,
  AchievementState,
  DefenseRecord,
} from './types';

const NON_TUTORIAL_LEVEL_IDS = LEVELS.filter((level) => level.id !== 'starter-elbow').map((level) => level.id);
const ENEMY_TYPES: EnemyType[] = ['spark', 'surge', 'kite', 'block', 'hex', 'crown', 'fracture', 'anvil', 'radiant'];
const TUTORIAL_FACTS: DefenseArchiveFact[] = [
  'creative-signal-spawned',
  'second-tower-built',
  'module-order-changed',
  'wrapped-program-configured',
  'targeting-mode-configured',
  'tower-maxed',
  'trail-module-fired',
];

const booleanProgress = (value: boolean): { current: number; target: number } => ({ current: value ? 1 : 0, target: 1 });
const factAchievement = (
  id: string,
  category: 'tutorial' | 'challenge',
  fact: DefenseArchiveFact,
): AchievementDefinition => ({
  id,
  category,
  progress: (state) => booleanProgress(
    (category === 'tutorial' ? state.tutorialFacts : state.challengeFacts).includes(fact),
  ),
});

const difficultyAchievements = (difficultyId: DifficultyId): AchievementDefinition[] => [
  {
    id: `progress.clear.${difficultyId}`,
    category: 'progress',
    progress: (state) => ({
      current: NON_TUTORIAL_LEVEL_IDS.filter((levelId) => state.clears[difficultyId]?.includes(levelId)).length,
      target: NON_TUTORIAL_LEVEL_IDS.length,
    }),
  },
  {
    id: `progress.flawless.${difficultyId}`,
    category: 'progress',
    progress: (state) => ({
      current: NON_TUTORIAL_LEVEL_IDS.filter((levelId) => state.flawlessClears[difficultyId]?.includes(levelId)).length,
      target: NON_TUTORIAL_LEVEL_IDS.length,
    }),
  },
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'tutorial.complete', category: 'tutorial', progress: (state) => booleanProgress(state.tutorialCompleted) },
  factAchievement('tutorial.creative-signal', 'tutorial', 'creative-signal-spawned'),
  factAchievement('tutorial.second-tower', 'tutorial', 'second-tower-built'),
  factAchievement('tutorial.reorder', 'tutorial', 'module-order-changed'),
  factAchievement('tutorial.wrap', 'tutorial', 'wrapped-program-configured'),
  factAchievement('tutorial.targeting', 'tutorial', 'targeting-mode-configured'),
  factAchievement('tutorial.max-tower', 'tutorial', 'tower-maxed'),
  factAchievement('tutorial.trail', 'tutorial', 'trail-module-fired'),
  ...DIFFICULTIES.flatMap((difficulty) => difficultyAchievements(difficulty.id)),
  {
    id: 'progress.signal-spectrum',
    category: 'progress',
    progress: (state) => ({
      current: ENEMY_TYPES.filter((type) => state.defeatedTypes.includes(type)).length,
      target: ENEMY_TYPES.length,
    }),
  },
  {
    id: 'progress.purifier-1000',
    category: 'progress',
    progress: (state) => ({ current: Math.min(state.standardDefeated, 1000), target: 1000 }),
  },
  {
    id: 'challenge.single-tower',
    category: 'challenge',
    progress: (state) => booleanProgress(state.challengeWins.includes('single-tower')),
  },
  {
    id: 'challenge.level-one',
    category: 'challenge',
    progress: (state) => booleanProgress(state.challengeWins.includes('level-one')),
  },
  factAchievement('challenge.legendary-grid', 'challenge', 'legendary-tower-configured'),
  factAchievement('challenge.five-kinds', 'challenge', 'five-kinds-configured'),
];

const addUnique = <T>(items: T[], value: T): void => {
  if (!items.includes(value)) items.push(value);
};

export function applyDefenseArchiveFact(
  state: AchievementState,
  fact: DefenseArchiveFact,
  context: { standard: boolean; tutorial: boolean },
): void {
  if (TUTORIAL_FACTS.includes(fact)) addUnique(state.tutorialFacts, fact);
  if (context.standard && !context.tutorial && (fact === 'legendary-tower-configured' || fact === 'five-kinds-configured')) {
    addUnique(state.challengeFacts, fact);
  }
}

export function applyDefense(state: AchievementState, record: DefenseRecord): void {
  if (record.tutorial) {
    if (record.result === 'won') state.tutorialCompleted = true;
    return;
  }
  if (record.mode !== 'standard') return;
  let defeated = 0;
  for (const wave of record.waves) {
    for (const [variant, tally] of Object.entries(wave.enemies)) {
      defeated += tally?.defeated ?? 0;
      if (variant !== 'fracture-fragment' && (tally?.defeated ?? 0) > 0) addUnique(state.defeatedTypes, variant as EnemyType);
    }
  }
  state.standardDefeated += defeated;
  if (record.result !== 'won') return;
  const clears = state.clears[record.difficultyId] ?? [];
  addUnique(clears, record.levelId);
  state.clears[record.difficultyId] = clears;
  if (record.core === record.maxCore) {
    const flawless = state.flawlessClears[record.difficultyId] ?? [];
    addUnique(flawless, record.levelId);
    state.flawlessClears[record.difficultyId] = flawless;
  }
  if (record.towers.length === 1) addUnique(state.challengeWins, 'single-tower');
  if (record.towers.every((tower) => tower.level === 1)) addUnique(state.challengeWins, 'level-one');
}

export function evaluateAchievements(state: AchievementState, now = Date.now()): {
  progress: AchievementProgress[];
  newlyUnlocked: string[];
} {
  const newlyUnlocked: string[] = [];
  const progress = ACHIEVEMENTS.map((definition) => {
    const value = definition.progress(state);
    if (value.target > 0 && value.current >= value.target && !state.unlockedAt[definition.id]) {
      state.unlockedAt[definition.id] = now;
      newlyUnlocked.push(definition.id);
    }
    return {
      id: definition.id,
      category: definition.category,
      current: value.current,
      target: value.target,
      unlockedAt: state.unlockedAt[definition.id] ?? null,
    };
  });
  return { progress, newlyUnlocked };
}
