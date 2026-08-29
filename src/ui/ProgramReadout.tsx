import type { GameEngine } from '../game/engine';
import type { ShotBlueprint, TowerProgram } from '../game/types';
import { useTranslation } from 'react-i18next';
import { TriggerNode } from './TriggerNode';
import './ProgramReadout.css';

export function ProgramReadout({ program, engine, maxEnergy }: { program: TowerProgram; engine: GameEngine; maxEnergy: number }) {
  const { t } = useTranslation();
  const capacityWarning = program.shots.length > 0 && program.energyCost > maxEnergy
    ? t('program.capacity', { required: program.energyCost, capacity: maxEnergy }) : null;
  const warning = program.diagnostics[0]
    ? t(`program.diagnostics.${program.diagnostics[0].code}`)
    : capacityWarning;
  const hasTrigger = program.shots.some((shot) => shot.trigger);
  const countProjectiles = (shot: ShotBlueprint): number => {
    const own = shot.count * shot.repeats;
    const payload = shot.payload.reduce((sum, child) => sum + countProjectiles(child), 0);
    const releases = shot.static && shot.trigger?.type === 'proximity' ? shot.static.maxTriggers : shot.trigger ? 1 : 0;
    return own + own * releases * payload;
  };
  const countTriggers = (shot: ShotBlueprint): number => {
    const own = shot.trigger
      ? shot.count * shot.repeats * (shot.static && shot.trigger.type === 'proximity' ? shot.static.maxTriggers : 1)
      : 0;
    return own + own * shot.payload.reduce((sum, child) => sum + countTriggers(child), 0);
  };
  const projectileCount = program.shots.reduce((sum, shot) => sum + countProjectiles(shot), 0);
  const triggerCount = program.shots.reduce((sum, shot) => sum + countTriggers(shot), 0);
  const summary = program.shots.length === 0 ? t('program.empty') : t('program.summary', {
    casts: program.shots.length,
    energy: program.energyCost,
    projectiles: projectileCount,
    triggers: triggerCount > 0 ? t('program.triggerPart', { count: triggerCount }) : '',
    wrap: program.wraps > 0 ? t('program.wrapPart') : '',
  });
  return (
    <div className="program-output" data-tutorial-program>
      <div className={`program-readout ${warning ? 'warning' : ''}`}>
        <span className="readout-icon" aria-hidden="true"><i /></span>
        <div><strong>{summary}</strong><small>{warning ?? (program.wraps > 0
          ? t('program.wrapped') : hasTrigger
            ? t('program.triggered') : t('program.valid'))}</small></div>
        <span className="energy-cost">{program.energyCost} ⚡</span>
      </div>
      {!hasTrigger ? null : <div className="trigger-trace"><small>PAYLOAD</small><div>
        {program.shots.map((shot, index) => <TriggerNode key={`${shot.source}-${index}`} shot={shot} engine={engine} />)}
      </div></div>}
    </div>
  );
}
