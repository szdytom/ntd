import { useEffect, useRef, useState } from 'react';
import '../i18n';
import { TUTORIAL_LEVEL_ID, getLevel } from '../game/config';
import { DEFAULT_DIFFICULTY_ID } from '../game/difficulty';
import { GameEngine } from '../game/engine';
import type { SignalId } from '../game/types';
import { DEFAULT_SIGNAL_ID } from '../signals';
import { SignalArchive } from './SignalArchive';
import { DefenseArchive } from './DefenseArchive';
import { GameSession } from './GameSession';
import { LevelSelect, type LevelSelection } from './LevelSelect';
import { TutorialOffer } from './TutorialOffer';
import { defenseArchiveRepository } from '../defense-archive';
import { getAutoPauseEnabled, useAutoPauseEnabled } from './preferences';
import { ThoughtIndex } from './ThoughtIndex';
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
  const [archiveType, setArchiveType] = useState<SignalId | null>(null);
  const [defenseArchiveOpen, setDefenseArchiveOpen] = useState(false);
  const [tutorialOfferOpen, setTutorialOfferOpen] = useState(() => !tutorialOfferWasResolved());
  const [thoughtOpen, setThoughtOpen] = useState<{ id?: string } | null>(null);
  const thoughtOriginRef = useRef<HTMLElement | null>(null);
  const autoPauseEnabled = useAutoPauseEnabled();
  const start = (selection: LevelSelection): void => {
    const nextEngine = new GameEngine(selection);
    nextEngine.setAutoPauseEnabled(getAutoPauseEnabled());
    setEngine(nextEngine);
  };
  useEffect(() => {
    engine?.setAutoPauseEnabled(autoPauseEnabled);
  }, [autoPauseEnabled, engine]);
  useEffect(() => {
    if (!engine) return;
    let windowBlurred = false;
    let documentHidden = document.visibilityState !== 'visible';
    const syncPageFocus = (): void => engine.setAutoPauseCondition('page-focus', windowBlurred || documentHidden);
    const onBlur = (): void => {
      windowBlurred = true;
      syncPageFocus();
    };
    const onFocus = (): void => {
      windowBlurred = false;
      syncPageFocus();
    };
    const onVisibilityChange = (): void => {
      documentHidden = document.visibilityState !== 'visible';
      syncPageFocus();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    syncPageFocus();
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      engine.setAutoPauseCondition('page-focus', false);
    };
  }, [engine]);
  const openSignalArchive = (type: SignalId): void => {
    engine?.setAutoPauseCondition('signal-archive', true);
    setArchiveType(type);
  };
  const closeSignalArchive = (): void => {
    engine?.setAutoPauseCondition('signal-archive', false);
    setArchiveType(null);
  };
  const openThought = (id?: string): void => {
    thoughtOriginRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    engine?.setAutoPauseCondition('thought-index', true);
    setThoughtOpen(id ? { id } : {});
  };
  const closeThought = (): void => {
    engine?.setAutoPauseCondition('thought-index', false);
    setThoughtOpen(null);
    requestAnimationFrame(() => thoughtOriginRef.current?.focus());
  };
  const declineTutorial = (): void => {
    rememberTutorialOfferResolution();
    setTutorialOfferOpen(false);
  };
  const acceptTutorial = (): void => {
    setTutorialOfferOpen(false);
    start(tutorialSelection());
  };
  return <>
    <div className={thoughtOpen ? 'app-content-covered' : ''} inert={Boolean(thoughtOpen)} aria-hidden={thoughtOpen ? true : undefined}>
    {defenseArchiveOpen
      ? <DefenseArchive repository={defenseArchiveRepository} onBack={() => setDefenseArchiveOpen(false)} />
      : archiveType
      ? <SignalArchive initialType={archiveType} onBack={closeSignalArchive} backToBattlefield={Boolean(engine)} />
      : engine
        ? <GameSession
          engine={engine}
          suspended={Boolean(thoughtOpen)}
          defenseArchive={defenseArchiveRepository}
          onExit={() => setEngine(null)}
          onOpenArchive={openSignalArchive}
          onOpenThought={openThought}
          onTutorialResolved={rememberTutorialOfferResolution}
        />
        : <LevelSelect onStart={start} onOpenArchive={() => setArchiveType(DEFAULT_SIGNAL_ID)} onOpenDefenseArchive={() => setDefenseArchiveOpen(true)} onOpenThought={() => openThought()} />}
    {tutorialOfferOpen && !engine && !archiveType && !defenseArchiveOpen
      ? <TutorialOffer onAccept={acceptTutorial} onDecline={declineTutorial} />
      : null}
    </div>
    {thoughtOpen ? <ThoughtIndex {...(thoughtOpen.id ? { initialThoughtId: thoughtOpen.id } : {})} onBack={closeThought} backToBattlefield={Boolean(engine)} /> : null}
  </>;
}
