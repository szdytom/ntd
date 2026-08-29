import { useState } from 'react';
import '../i18n';
import { TUTORIAL_LEVEL_ID, getLevel } from '../game/config';
import { DEFAULT_DIFFICULTY_ID } from '../game/difficulty';
import { GameEngine } from '../game/engine';
import { EnemyArchive } from './EnemyArchive';
import { GameSession } from './GameSession';
import { LevelSelect, type LevelSelection } from './LevelSelect';
import { TutorialOffer } from './TutorialOffer';
import './App.css';

export const TUTORIAL_OFFER_STORAGE_KEY = 'prism-bastion-tutorial-offer-resolved';

const tutorialOfferWasResolved = (): boolean => {
  try {
    return globalThis.localStorage?.getItem(TUTORIAL_OFFER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberTutorialOfferResolution = (): void => {
  try {
    globalThis.localStorage?.setItem(TUTORIAL_OFFER_STORAGE_KEY, '1');
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
};

const tutorialSelection = (): LevelSelection => ({
  levelId: TUTORIAL_LEVEL_ID,
  mode: 'standard',
  difficultyId: DEFAULT_DIFFICULTY_ID,
  creative: {
    healthScale: 1,
    speedScale: 1,
    coreStability: 20,
    waveCount: getLevel(TUTORIAL_LEVEL_ID).waves.length,
  },
});

export function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [tutorialOfferOpen, setTutorialOfferOpen] = useState(() => !tutorialOfferWasResolved());
  const start = (selection: LevelSelection): void => setEngine(new GameEngine(selection));
  const declineTutorial = (): void => {
    rememberTutorialOfferResolution();
    setTutorialOfferOpen(false);
  };
  const acceptTutorial = (): void => {
    setTutorialOfferOpen(false);
    start(tutorialSelection());
  };
  return <>
    {engine
      ? <GameSession engine={engine} onExit={() => setEngine(null)} onTutorialResolved={rememberTutorialOfferResolution} />
      : archiveOpen
        ? <EnemyArchive onBack={() => setArchiveOpen(false)} />
        : <LevelSelect onStart={start} onOpenArchive={() => setArchiveOpen(true)} />}
    {tutorialOfferOpen && !engine && !archiveOpen
      ? <TutorialOffer onAccept={acceptTutorial} onDecline={declineTutorial} />
      : null}
  </>;
}
