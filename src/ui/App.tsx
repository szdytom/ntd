import { useState } from 'react';
import '../i18n';
import { GameEngine } from '../game/engine';
import { EnemyArchive } from './EnemyArchive';
import { GameSession } from './GameSession';
import { LevelSelect, type LevelSelection } from './LevelSelect';
import './App.css';

export function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const start = (selection: LevelSelection): void => setEngine(new GameEngine(selection));
  return <>
    {engine
      ? <GameSession engine={engine} onExit={() => setEngine(null)} />
      : archiveOpen
        ? <EnemyArchive onBack={() => setArchiveOpen(false)} />
        : <LevelSelect onStart={start} onOpenArchive={() => setArchiveOpen(true)} />}
  </>;
}
