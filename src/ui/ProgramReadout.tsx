import type { GameEngine } from '../game/engine';
import type { ShotBlueprint, TowerProgram } from '../game/types';
import { useTranslation } from 'react-i18next';
import { moduleShortName } from '../i18n/presentation';
import { TriggerNode } from './TriggerNode';
import './ProgramReadout.css';

export function ProgramReadout({ program, engine, maxEnergy }: { program: TowerProgram; engine: GameEngine; maxEnergy: number }) {
  const { t } = useTranslation();
  const capacityWarning = program.shots.length > 0 && program.energyCost > maxEnergy
    ? t('program.capacity', { required: program.energyCost, capacity: maxEnergy }) : null;
  const diagnostic = program.diagnostics.find((candidate) => candidate.severity === 'error')
    ?? program.diagnostics[0];
  const warning = diagnostic
    ? t(`program.diagnostics.${diagnostic.code}`, {
      module: diagnostic.moduleId ? moduleShortName(t, diagnostic.moduleId) : '',
      related: diagnostic.relatedModuleId ? moduleShortName(t, diagnostic.relatedModuleId) : '',
    })
    : capacityWarning;
  const hasTrigger = program.shots.some((shot) => shot.trigger);
  const countProjectiles = (shot: ShotBlueprint): number => {
    const own = shot.count * shot.repeats;
    const payload = shot.payload.reduce((sum, child) => sum + countProjectiles(child), 0);
    const releases = shot.trigger ? 1 : 0;
    return own + own * releases * payload;
  };
  const countTriggers = (shot: ShotBlueprint): number => {
    const own = shot.trigger ? shot.count * shot.repeats : 0;
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
        <div><strong>{summary}</strong><small>{warning ?? (program.wraps > 0
          ? t('program.wrapped') : hasTrigger
            ? t('program.triggered') : t('program.valid'))}</small></div>
      </div>
      {!hasTrigger ? null : <div className="trigger-trace"><small>{t('program.payload')}</small><div>
        {program.shots.map((shot, index) => <TriggerNode key={`${shot.source}-${index}`} shot={shot} engine={engine} />)}
      </div></div>}
    </div>
  );
}
