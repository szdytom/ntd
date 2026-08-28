import './GameSession.css';
import type { GameEngine } from '../game/engine';
import { GameHeader } from './GameHeader';
import { Battlefield } from './Battlefield';
import { useGameState } from './useGameState';
import { Workshop } from './Workshop';
import { Toast } from './Toast';
import { RewardDraft } from './RewardDraft';

export function GameSession({ engine, onExit }: { engine: GameEngine; onExit: () => void }) {
  const { view, toast } = useGameState(engine);
  const { game: snapshot, selectedTower: tower } = view;
  return <div className="app-shell">
    <GameHeader engine={engine} snapshot={snapshot} onExit={onExit} />
    <div className="workspace"><Battlefield engine={engine} view={view} />{tower ? <Workshop engine={engine} tower={tower} view={view} /> : null}</div>
    <RewardDraft engine={engine} snapshot={snapshot} inventory={view.moduleInventory} /><Toast toast={toast} />
  </div>;
}
