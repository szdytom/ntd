import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import type { GameViewSnapshot, ModuleId, Tower } from '../game/types';
import type { ModuleKind } from '../modules';
import { kindLabel } from '../i18n/presentation';
import { ModuleCard } from './ModuleCard';
import { ModuleInspector } from './ModuleInspector';
import { ModuleSlot } from './ModuleSlot';
import { ProgramReadout } from './ProgramReadout';
import { TowerOverview } from './TowerOverview';
import './Workshop.css';

export function Workshop({ engine, tower, view }: { engine: GameEngine; tower: Tower; view: GameViewSnapshot }) {
  const { t } = useTranslation();
  const { revision } = view;
  const definitions = useMemo(() => engine.getLibraryModules(), [engine, revision]);
  const [selectedModule, setSelectedModule] = useState<ModuleId | null>(() => definitions[0]?.id ?? null);
  const [kindFilter, setKindFilter] = useState<'all' | ModuleKind>('all');
  const visibleDefinitions = useMemo(
    () => kindFilter === 'all'
      ? definitions
      : definitions.filter((definition) => definition.kind === kindFilter),
    [definitions, kindFilter],
  );
  useEffect(() => {
    if (!selectedModule || !visibleDefinitions.some((definition) => definition.id === selectedModule)) {
      setSelectedModule(visibleDefinitions[0]?.id ?? null);
    }
  }, [selectedModule, visibleDefinitions]);
  const selectedDefinition = selectedModule
    ? definitions.find((definition) => definition.id === selectedModule)
    : undefined;
  const filterLabel = kindFilter === 'all' ? t('kinds.all') : kindLabel(t, kindFilter);
  const program = view.selectedProgram ?? engine.modules.compile(tower.slots);

  const quickInstall = (id: ModuleId): void => {
    const empty = tower.slots.findIndex((slot) => slot === null);
    if (empty >= 0) engine.installModule(empty, id);
  };

  return (
    <aside className="workshop" aria-label={t('workshop.aria')}>
      <div className="workshop-head">
        <h2>{t('workshop.title')} <span>{t('workshop.subtitle')}</span></h2>
        <div className="workshop-head-actions">
          <div className="tower-id">NODE T{String(tower.id).padStart(2, '0')}</div>
          <button className="workshop-close" data-tutorial-workshop-close onClick={() => engine.selectTower(null)} aria-label={t('workshop.close')}>×</button>
        </div>
      </div>

      <div className="workshop-body">
        <div className="workshop-side">
          <TowerOverview tower={tower} engine={engine} />
          {selectedDefinition ? <ModuleInspector definition={selectedDefinition} /> : null}
        </div>

        <div className="workshop-main">
          <section className="program-section">
            <div className="section-title">
              <div><span className="step-number">01</span><div><h3>{t('workshop.arrange')}</h3><small>{t('workshop.leftToRight', { count: tower.slots.length })}</small></div></div>
              <button onClick={() => engine.clearLoadout()}>{t('workshop.clear')}</button>
            </div>
            <div className="slot-flow" style={{ '--slot-count': tower.slots.length } as CSSProperties}>
              {tower.slots.map((moduleId, index) => (
                <ModuleSlot
                  key={index}
                  index={index}
                  isLast={index === tower.slots.length - 1}
                  definition={moduleId ? engine.modules.get(moduleId) : undefined}
                  selectedModule={selectedModule}
                  engine={engine}
                />
              ))}
            </div>
            <ProgramReadout program={program} engine={engine} maxEnergy={tower.maxEnergy} />
          </section>

          <section className="library-section">
            <div className="section-title library-title">
              <div><span className="step-number">02</span><div><h3>{filterLabel} · {visibleDefinitions.length}</h3><small>{t('workshop.installHint')}</small></div></div>
              <div className="module-filters" aria-label={t('workshop.filterAria')}>
                {([
                  ['all', 'ALL'],
                  ['projectile', kindLabel(t, 'projectile')],
                  ['static', kindLabel(t, 'static')],
                  ['modifier', kindLabel(t, 'modifier')],
                  ['trail', kindLabel(t, 'trail')],
                  ['logic', kindLabel(t, 'logic')],
                ] as const).map(([kind, label]) => (
                  <button key={kind} className={kindFilter === kind ? `active ${kind}` : kind} onClick={() => setKindFilter(kind)}>{label}</button>
                ))}
              </div>
            </div>
            <div className={`module-grid ${kindFilter === 'all' ? 'all-modules' : ''}`}>
              {visibleDefinitions.map((definition) => {
                const counts = view.moduleInventory[definition.id];
                const available = counts?.available ?? 0;
                const total = counts?.total ?? 0;
                const exhausted = engine.mode === 'standard' && available === 0;
                return (
                  <ModuleCard
                    key={definition.id}
                    definition={definition}
                    tutorialId={definition.id}
                    selected={definition.id === selectedModule}
                    exhausted={exhausted}
                    inventoryLabel={engine.mode === 'standard'
                      ? exhausted ? t('workshop.inventoryExhausted', { total }) : t('workshop.inventoryAvailable', { available, total })
                      : undefined}
                    onSelect={() => setSelectedModule(definition.id)}
                    onQuickInstall={() => quickInstall(definition.id)}
                  />
                );
              })}
              {visibleDefinitions.length === 0 ? (
                <div className="module-library-empty">{t('workshop.emptyLibrary', { kind: filterLabel })}</div>
              ) : null}
            </div>
          </section>
        </div>

      </div>
    </aside>
  );
}
