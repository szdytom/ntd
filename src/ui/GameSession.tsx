import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './GameSession.module.css';
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

export function GameSession({ engine, defenseArchive, suspended = false, onExit, onOpenArchive, onOpenThought, onTutorialResolved }: {
  engine: GameEngine;
  defenseArchive: DefenseArchiveRepository;
  suspended?: boolean;
  onExit: () => void;
  onOpenArchive: (type: SignalId) => void;
  onOpenThought?: (thoughtId: string) => void;
  onTutorialResolved: () => void;
}) {
  const { t } = useTranslation();
  const { view, toast } = useGameState(engine);
  const [defenseArchiveToast, setDefenseArchiveToast] = useState<ToastState | null>(null);
  const [workshopToast, setWorkshopToast] = useState<ToastState | null>(null);
  const { game: snapshot, selectedTower: tower } = view;
  const workshopOpen = Boolean(tower && !snapshot.draft);
  useLayoutEffect(() => {
    engine.setAutoPauseCondition('workshop', workshopOpen);
    return () => engine.setAutoPauseCondition('workshop', false);
  }, [engine, workshopOpen]);
  useEffect(() => engine.subscribe((event) => {
    const operation = event.type === 'defense-archive-fact'
      ? defenseArchive.recordFact(event.fact, { standard: engine.rules.archive === 'standard', tutorial: engine.tutorialEnabled })
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
  useEffect(() => {
    if (!workshopToast) return;
    const timeout = window.setTimeout(() => setWorkshopToast(null), 2_700);
    return () => window.clearTimeout(timeout);
  }, [workshopToast]);
  return <div className={styles.appShell} data-app-shell>
    <div className={styles.gameConsole}>
      <GameHeader engine={engine} snapshot={snapshot} onExit={onExit} />
      <div className={styles.workspace}>
        <Battlefield
          className={styles.battlefield!}
          engine={engine}
          view={view}
          suspended={suspended}
          onOpenArchive={onOpenArchive}
          workshop={tower && !snapshot.draft ? <Workshop
            engine={engine}
            tower={tower}
            view={view}
            onToast={(message, tone) => setWorkshopToast({ message, tone, nonce: Date.now() })}
            {...(onOpenThought ? { onOpenThought } : {})}
          /> : null}
        >
          <RewardDraft engine={engine} snapshot={snapshot} inventory={view.moduleInventory} {...(onOpenThought ? { onOpenThought } : {})} />
        </Battlefield>
      </div>
    </div>
    <Toast toast={defenseArchiveToast ?? workshopToast ?? toast} />
    <TutorialGuide engine={engine} view={view} onResolved={onTutorialResolved} />
  </div>;
}
