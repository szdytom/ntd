import type { GameEngine } from '../game/engine';
import type { TowerProgram } from '../game/types';
import { TriggerNode } from './TriggerNode';
import './ProgramReadout.css';

export function ProgramReadout({ program, engine, maxEnergy }: { program: TowerProgram; engine: GameEngine; maxEnergy: number }) {
  const capacityWarning = program.shots.length > 0 && program.energyCost > maxEnergy
    ? `本轮需要 ${program.energyCost} 能量，超过该塔 ${maxEnergy} 的能量上限` : null;
  const warning = program.warnings[0] ?? capacityWarning;
  const hasTrigger = program.shots.some((shot) => shot.trigger);
  return (
    <div className="program-output" data-tutorial-program>
      <div className={`program-readout ${warning ? 'warning' : ''}`}>
        <span className="readout-icon" aria-hidden="true"><i /></span>
        <div><strong>{program.summary}</strong><small>{warning ?? (program.wraps > 0
          ? '序列末端已回到槽位 1，并额外读取一次法术牌组' : hasTrigger
            ? '载荷只在触发条件满足后释放' : '程序有效：修正与尾迹会被右侧的下一枚弹射物消耗')}</small></div>
        <span className="energy-cost">{program.energyCost} ⚡</span>
      </div>
      {!hasTrigger ? null : <div className="trigger-trace"><small>PAYLOAD</small><div>
        {program.shots.map((shot, index) => <TriggerNode key={`${shot.source}-${index}`} shot={shot} engine={engine} />)}
      </div></div>}
    </div>
  );
}
