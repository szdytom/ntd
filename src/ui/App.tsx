import { useState } from 'react';
import '../i18n';
import { GameEngine } from '../game/engine';
import { GameSession } from './GameSession';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LevelSelect, type LevelSelection } from './LevelSelect';
import './App.css';

export function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const start = (selection: LevelSelection): void => setEngine(new GameEngine(selection));
  return <>
    <LanguageSwitcher />
    {engine
      ? <GameSession engine={engine} onExit={() => setEngine(null)} />
      : <LevelSelect onStart={start} />}
  </>;
}
