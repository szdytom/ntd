import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './GameSession.module.css';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { SignalId } from '@prism-bastion/game-core/game/types';
import { GameHeader } from '@prism-bastion/web-shared/ui/GameHeader';
import { Battlefield, type BattlefieldUtilityPanel } from '@prism-bastion/web-shared/ui/Battlefield';
import { useGameState, type ToastState } from '@prism-bastion/web-shared/ui/useGameState';
import { Workshop } from '@prism-bastion/web-shared/ui/Workshop';
import { Toast } from '@prism-bastion/web-shared/ui/Toast';
import { RewardDraft } from './RewardDraft';
import { TutorialGuide } from './TutorialGuide';
import type { DefenseArchiveRepository } from './defense-archive';

export function GameSession({ engine, backgroundEngine, defenseArchive, notificationToast, suspended = false, onExit, onOpenArchive, onOpenThought, onTutorialResolved, onLaunch, launchDisabled, launchReady = false, launchReadyLabel, launchCancelLabel, workshopEnabled = true, battlefieldOverlay, battlefieldUtility }: {
  engine: GameEngine;
  backgroundEngine?: GameEngine | undefined;
  defenseArchive: DefenseArchiveRepository;
  notificationToast?: ToastState | null | undefined;
  suspended?: boolean;
  onExit: () => void;
  onOpenArchive: (type: SignalId) => void;
  onOpenThought?: (thoughtId: string) => void;
  onTutorialResolved: () => void;
  onLaunch?: () => void;
  launchDisabled?: boolean;
  launchReady?: boolean;
  launchReadyLabel?: string;
  launchCancelLabel?: string;
  workshopEnabled?: boolean;
  battlefieldOverlay?: ReactNode;
  battlefieldUtility?: BattlefieldUtilityPanel;
}) {
  const { t } = useTranslation();
  const { view, toast } = useGameState(engine);
  const [defenseArchiveToast, setDefenseArchiveToast] = useState<ToastState | null>(null);
  const [workshopToast, setWorkshopToast] = useState<ToastState | null>(null);
  const [advancedDraftVisible, setAdvancedDraftVisible] = useState(false);
  const { game: snapshot, selectedTower: tower } = view;
  const workshopOpen = Boolean(workshopEnabled && tower && !snapshot.draft);
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
  useEffect(() => {
    const toggleAdvancedDraft = (event: KeyboardEvent): void => {
      if (event.key !== 'F3') return;
      event.preventDefault();
      if (!event.repeat) setAdvancedDraftVisible((visible) => !visible);
    };
    window.addEventListener('keydown', toggleAdvancedDraft);
    return () => window.removeEventListener('keydown', toggleAdvancedDraft);
  }, []);
  return <div className={styles.appShell} data-app-shell>
    <div className={styles.gameConsole}>
      <GameHeader engine={engine} snapshot={snapshot} onExit={onExit} launchReady={launchReady}
        {...(launchReadyLabel ? { launchReadyLabel } : {})} {...(launchCancelLabel ? { launchCancelLabel } : {})}
        {...(onLaunch ? { onLaunch } : {})} {...(launchDisabled !== undefined ? { launchDisabled } : {})} />
      <div className={styles.workspace}>
        <Battlefield
          className={styles.battlefield!}
          engine={engine}
          backgroundEngine={backgroundEngine}
          view={view}
          suspended={suspended}
          onOpenArchive={onOpenArchive}
          {...(battlefieldUtility ? { utilityPanel: battlefieldUtility } : {})}
          workshop={workshopEnabled && tower && !snapshot.draft ? <Workshop
            engine={engine}
            tower={tower}
            view={view}
            onToast={(message, tone) => setWorkshopToast({ message, tone, nonce: Date.now() })}
            {...(onOpenThought ? { onOpenThought } : {})}
          /> : null}
        >
          {battlefieldOverlay}
          <RewardDraft
            engine={engine}
            snapshot={snapshot}
            inventory={view.moduleInventory}
            advancedVisible={advancedDraftVisible}
            {...(onOpenThought ? { onOpenThought } : {})}
          />
        </Battlefield>
      </div>
    </div>
    <Toast toast={notificationToast ?? defenseArchiveToast ?? workshopToast ?? toast} />
    <TutorialGuide engine={engine} view={view} onResolved={onTutorialResolved} />
  </div>;
}
