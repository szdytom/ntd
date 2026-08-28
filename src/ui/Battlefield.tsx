import { ECONOMY_BALANCE } from '../game/balance';
import { WORLD } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { GameViewSnapshot } from '../game/types';
import { GameCanvas } from './GameCanvas';
import { EnemyPreview } from './EnemyPreview';
import './Battlefield.css';

export function Battlefield({ engine, view }: { engine: GameEngine; view: GameViewSnapshot }) {
  const { game: snapshot } = view;
  const phase = snapshot.status === 'wave'
    ? '信号接触中'
    : snapshot.status === 'reward'
      ? '截获模块中'
      : snapshot.paused ? '系统暂停' : '规划阶段';
  const terminal = snapshot.status === 'won' || snapshot.status === 'lost';
  const spawn = engine.path.pointAtDistance(44).position;
  const core = engine.path.pointAtDistance(engine.path.length - 54).position;
  return (
    <section className="battle-card" aria-label="防御战场">
      <div className="battle-head">
        <div>
          <div className="eyebrow"><i className={`live-dot ${snapshot.status === 'wave' && !snapshot.paused ? 'combat' : ''}`} /><span>{phase}</span></div>
          <h1>{engine.level.name} <span>/ {engine.level.sector}</span></h1>
        </div>
        <div className="incoming"><small>下一波信号</small><EnemyPreview engine={engine} wave={snapshot.wave} /></div>
      </div>

      <div className="canvas-wrap">
        <GameCanvas engine={engine} />
        {!snapshot.boss ? null : (
          <div className="boss-status" aria-label={`${snapshot.boss.name} Boss 状态`}>
            <div className="boss-status-head">
              <span><i />GUARDIAN</span>
              <strong>{snapshot.boss.name}</strong>
              <b>{snapshot.boss.hp}/{snapshot.boss.maxHp}</b>
            </div>
            <div className="boss-shield-readout">
              <small>◇ SHIELD</small>
              <div><i style={{ width: `${snapshot.boss.shield / snapshot.boss.maxShield * 100}%` }} /></div>
              <b>{snapshot.boss.shield}/{snapshot.boss.maxShield}</b>
            </div>
            <div className="boss-health-bar"><i style={{ width: `${snapshot.boss.hp / snapshot.boss.maxHp * 100}%` }} /></div>
          </div>
        )}
        <div className="spawn-label" style={{ top: `${spawn.y / WORLD.height * 100}%` }}><i /><span>信号入口</span></div>
        <div className="core-label" style={{ top: `${core.y / WORLD.height * 100}%`, bottom: 'auto' }}><span>棱镜核心</span><i /></div>
        <div className="battle-tip">
          <span className="tip-key">+</span>
          <div><strong>部署新节点</strong><small>点击虚线圆环 · 消耗 {ECONOMY_BALANCE.towerCost} ◇</small></div>
        </div>
        {!terminal ? null : (
          <div className="status-overlay" data-tone={snapshot.status}>
            <div className="status-shape">✦</div>
            <h2>{snapshot.status === 'won' ? '区域净化完成' : '棱镜核心离线'}</h2>
            <p>{snapshot.status === 'won'
              ? `最终净化值 ${snapshot.score} · 核心稳定度 ${snapshot.core}/${snapshot.maxCore}`
              : `坚持到波次 ${snapshot.wave} · 调整模块序列后再次尝试`}</p>
            <button onClick={() => engine.reset()}>重新校准</button>
          </div>
        )}
      </div>

      <footer className="battle-footer">
        <div className="legend">
          <span><i className="tri swatch-yellow" />火花</span>
          <span><i className="square swatch-pink" />风筝</span>
          <span><i className="hex swatch-purple" />重甲</span>
        </div>
        <div className="score-line">
          <span className="mode-chip">{snapshot.mode === 'standard' ? '正式模式' : '创造模式'}</span>
          <span className="difficulty-chip">{engine.difficulty.name}</span>
          净化值 <strong>{String(snapshot.score).padStart(5, '0')}</strong>
        </div>
        <details className="battle-access-controls">
          <summary>键盘战场控制</summary>
          <div>
            {view.towers.map((tower) => (
              <button key={tower.id} onClick={() => engine.selectTower(tower.id)}>选择节点 T{String(tower.id).padStart(2, '0')}</button>
            ))}
            {engine.level.towerPads.map((_, padIndex) => (
              view.towers.some((tower) => tower.padIndex === padIndex)
                ? null
                : <button key={`pad-${padIndex}`} onClick={() => engine.placeTower(padIndex)}>部署节点 {padIndex + 1}</button>
            ))}
          </div>
        </details>
      </footer>
    </section>
  );
}
