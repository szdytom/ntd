import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './GameSession.css';
import type { GameEngine } from '../game/engine';
import type { SignalId } from '../game/types';
import { GameHeader } from './GameHeader';
import { Battlefield } from './Battlefield';
import { useGameState } from './useGameState';
import { Workshop } from './Workshop';
import { Toast } from './Toast';
import { RewardDraft } from './RewardDraft';
import { TutorialGuide } from './TutorialGuide';
import type { DefenseArchiveRepository } from '../defense-archive';
import type { ToastState } from './useGameState';

export function GameSession({ engine, defenseArchive, onExit, onOpenArchive, onTutorialResolved }: {
  engine: GameEngine;
  defenseArchive: DefenseArchiveRepository;
  onExit: () => void;
  onOpenArchive: (type: SignalId) => void;
  onTutorialResolved: () => void;
}) {
  const { t } = useTranslation();
  const { view, toast } = useGameState(engine);
  const [defenseArchiveToast, setDefenseArchiveToast] = useState<ToastState | null>(null);
  const { game: snapshot, selectedTower: tower } = view;
  const workshopOpen = Boolean(tower && !snapshot.draft);
  useLayoutEffect(() => {
    engine.setAutoPauseCondition('workshop', workshopOpen);
    return () => engine.setAutoPauseCondition('workshop', false);
  }, [engine, workshopOpen]);
  useEffect(() => engine.subscribe((event) => {
    const operation = event.type === 'defense-archive-fact'
      ? defenseArchive.recordFact(event.fact, { standard: engine.mode === 'standard', tutorial: engine.tutorialEnabled })
      : event.type === 'defense-completed' ? defenseArchive.recordDefense(event.report) : null;
    if (!operation) return;
    void operation.then((unlocked) => {
      if (unlocked.length === 0) return;
      const first = t(`defenseArchive.achievements.${unlocked[0]}.name`);
      setDefenseArchiveToast({
        message: unlocked.length === 1
          ? t('defenseArchive.achievementUnlocked', { name: first })
          : t('defenseArchive.achievementsUnlocked', { name: first, count: unlocked.length }),
        tone: 'good',
        nonce: Date.now(),
      });
    }).catch(() => setDefenseArchiveToast({ message: t('defenseArchive.writeError'), tone: 'warn', nonce: Date.now() }));
  }), [defenseArchive, engine, t]);
  useEffect(() => {
    if (!defenseArchiveToast) return;
    const timeout = window.setTimeout(() => setDefenseArchiveToast(null), 2_700);
    return () => window.clearTimeout(timeout);
  }, [defenseArchiveToast]);
  return <div className="app-shell">
    <div className="game-console">
      <GameHeader engine={engine} snapshot={snapshot} onExit={onExit} />
      <div className="workspace">
        <Battlefield
          engine={engine}
          view={view}
          onOpenArchive={onOpenArchive}
          workshop={tower && !snapshot.draft ? <Workshop engine={engine} tower={tower} view={view} /> : null}
        >
          <RewardDraft engine={engine} snapshot={snapshot} inventory={view.moduleInventory} />
        </Battlefield>
      </div>
    </div>
    <Toast toast={defenseArchiveToast ?? toast} />
    <TutorialGuide engine={engine} view={view} onResolved={onTutorialResolved} />
  </div>;
}
