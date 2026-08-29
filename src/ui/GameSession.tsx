import './GameSession.css';
import type { GameEngine } from '../game/engine';
import type { EnemyType } from '../game/types';
import { GameHeader } from './GameHeader';
import { Battlefield } from './Battlefield';
import { useGameState } from './useGameState';
import { Workshop } from './Workshop';
import { Toast } from './Toast';
import { RewardDraft } from './RewardDraft';
import { TutorialGuide } from './TutorialGuide';

export function GameSession({ engine, onExit, onOpenArchive, onTutorialResolved }: {
  engine: GameEngine;
  onExit: () => void;
  onOpenArchive: (type: EnemyType) => void;
  onTutorialResolved: () => void;
}) {
  const { view, toast } = useGameState(engine);
  const { game: snapshot, selectedTower: tower } = view;
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
    <Toast toast={toast} />
    <TutorialGuide engine={engine} view={view} onResolved={onTutorialResolved} />
  </div>;
}
