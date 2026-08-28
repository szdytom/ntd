import type { GameEngine } from '../game/engine';
import type { GameSnapshot } from '../game/types';
import './GameHeader.css';

export function GameHeader({
  engine,
  snapshot,
  onExit,
}: {
  engine: GameEngine;
  snapshot: GameSnapshot;
  onExit: () => void;
}) {
  const waveDisabled = snapshot.status !== 'planning';
  const launchLabel = snapshot.status === 'wave'
    ? `${snapshot.enemiesAlive + snapshot.waveQueue} 个信号`
    : snapshot.status === 'reward'
      ? '等待模块选择'
      : '启动信号';
  const launchWave = snapshot.wave >= snapshot.maxWaves
    ? '已完成'
    : `波次 ${String(snapshot.wave + 1).padStart(2, '0')}`;

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true"><i /><b /><span /></div>
        <div>
          <div className="brand-name">PRISM <span>BASTION</span></div>
          <div className="brand-sub">MODULAR DEFENSE LAB · 07</div>
        </div>
      </div>

      <div className="top-stats" aria-label="游戏状态">
        <div className="metric core-metric">
          <span className="metric-icon heart-icon">♥</span>
          <div><small>核心稳定度</small><strong>{snapshot.core}<em>/{snapshot.maxCore}</em></strong></div>
          <div className="micro-bar"><i style={{ width: `${snapshot.core / snapshot.maxCore * 100}%` }} /></div>
        </div>
        <div className="metric shard-metric">
          <span className="metric-icon shard-icon">◇</span>
          <div><small>晶片</small><strong>{snapshot.mode === 'creative' ? '∞' : snapshot.shards}</strong></div>
        </div>
        <div className="metric wave-metric">
          <span className="metric-icon wave-icon">≋</span>
          <div><small>信号波次</small><strong>{snapshot.wave}<em>/{snapshot.maxWaves}</em></strong></div>
        </div>
      </div>

      <div className="top-actions">
        <button className="icon-button exit-button" onClick={onExit} aria-label="返回关卡选择">←</button>
        <div className="speed-switch" role="group" aria-label="游戏速度">
          {[1, 2].map((speed) => (
            <button key={speed} className={snapshot.speed === speed ? 'active' : ''} onClick={() => engine.setSpeed(speed)}>{speed}×</button>
          ))}
        </div>
        <button className={`icon-button ${snapshot.paused ? 'active' : ''}`} onClick={() => engine.togglePause()} aria-label="暂停游戏">
          <span className="pause-glyph">{snapshot.paused ? '▶' : 'Ⅱ'}</span>
        </button>
        <button className="launch-button" onClick={() => engine.startWave()} disabled={waveDisabled}>
          <span className="launch-icon">▶</span>
          <span><small>{launchLabel}</small><strong>{launchWave}</strong></span>
        </button>
      </div>
    </header>
  );
}
