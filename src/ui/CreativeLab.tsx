import type { CSSProperties } from 'react';
import { ENEMIES } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { CreativeSetup, EnemyType } from '../game/types';
import './CreativeLab.css';

const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'kite', 'block', 'hex', 'crown', 'fracture', 'radiant'];

export function CreativeLab({ engine, setup }: { engine: GameEngine; setup: CreativeSetup }) {
  return <section className="creative-lab">
    <div className="section-title"><div><h3>创造模式信号台</h3><small>调整后续波次，或立即投放单个敌人</small></div></div>
    <div className="creative-enemy-grid">{ENEMY_TYPES.map((type) => {
      const enemy = ENEMIES[type];
      return <div key={type}><span style={{ '--enemy-color': enemy.color } as CSSProperties}><i className={enemy.shape === 'star' ? 'star' : enemy.shape === 'ring' ? 'ring' : ''} />{enemy.name}</span>
        <input type="number" min="0" max="40" value={setup.wave[type]}
          onChange={(event) => engine.configureCreativeEnemy(type, Number(event.target.value))} aria-label={`${enemy.name}下一波数量`} />
        <button onClick={() => engine.spawnCreativeEnemy(type)} title={`立即生成${enemy.name}`}>＋</button></div>;
    })}</div>
    <div className="creative-scales">
      <label><span>生命倍率</span><input type="range" min="0.25" max="5" step="0.25" value={setup.healthScale} onChange={(event) => engine.configureCreativeScales(Number(event.target.value), setup.speedScale)} /><b>{setup.healthScale.toFixed(2)}×</b></label>
      <label><span>速度倍率</span><input type="range" min="0.25" max="3" step="0.25" value={setup.speedScale} onChange={(event) => engine.configureCreativeScales(setup.healthScale, Number(event.target.value))} /><b>{setup.speedScale.toFixed(2)}×</b></label>
    </div>
  </section>;
}
