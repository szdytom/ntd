import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './GameSession.module.css';
import type { GameEngine } from '../game/engine';
import type { SignalId } from '../game/types';
import { GameHeader } from './GameHeader';
import { Battlefield, type BattlefieldUtilityPanel } from './Battlefield';
import { useGameState } from './useGameState';
import { Workshop } from './Workshop';
import { Toast } from './Toast';
import { RewardDraft } from './RewardDraft';
import { TutorialGuide } from './TutorialGuide';
import { TowerLoadoutOverlay } from './TowerLoadoutOverlay';
import type { DefenseArchiveRepository } from '../defense-archive';
import type { ToastState } from './useGameState';

export function GameSession({ engine, backgroundEngine, defenseArchive, notificationToast, suspended = false, onExit, onOpenArchive, onOpenThought, onTutorialResolved, onLaunch, launchDisabled, launchReady = false, workshopEnabled = true, showTowerLoadouts = false, battlefieldUtility }: {
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
  workshopEnabled?: boolean;
  showTowerLoadouts?: boolean;
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
      <GameHeader engine={engine} snapshot={snapshot} onExit={onExit} launchReady={launchReady} {...(onLaunch ? { onLaunch } : {})} {...(launchDisabled !== undefined ? { launchDisabled } : {})} />
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
          {showTowerLoadouts ? <TowerLoadoutOverlay engine={engine} towers={view.towers} /> : null}
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
