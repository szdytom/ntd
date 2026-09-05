import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { GameViewSnapshot, ModuleId, Tower } from '@prism-bastion/game-core/game/types';
import { decodeOrchestration, encodeOrchestration } from '@prism-bastion/game-core/game/orchestration-codec';
import type { OrchestrationDecodeError } from '@prism-bastion/game-core/game/orchestration-codec';
import type { ModuleKind } from '@prism-bastion/game-core/modules';
import { kindLabel } from '../i18n/presentation';
import { ModuleCard } from './ModuleCard';
import { ModuleInspector } from './ModuleInspector';
import { ModuleSlot } from './ModuleSlot';
import { ProgramReadout } from './ProgramReadout';
import { TowerOverview } from './TowerOverview';
import { Tag } from './Tag';
import { thoughtRegistry } from '../thoughts';
import { useTouchModuleDrag } from './useTouchModuleDrag';
import './Workshop.css';

export function Workshop({ engine, tower, view, onOpenThought, onToast }: {
  engine: GameEngine;
  tower: Tower;
  view: GameViewSnapshot;
  onOpenThought?: (thoughtId: string) => void;
  onToast?: (message: string, tone: 'good' | 'warn') => void;
}) {
  const { t } = useTranslation();
  const workshopRef = useRef<HTMLElement>(null);
  const installModule = useCallback((slot: number, moduleId: ModuleId) => {
    engine.installModule(slot, moduleId);
  }, [engine]);
  const swapModules = useCallback((source: number, destination: number) => {
    engine.swapModules(source, destination);
  }, [engine]);
  useTouchModuleDrag(workshopRef, installModule, swapModules);
  const { revision } = view;
  const definitions = useMemo(() => engine.getLibraryModules(), [engine, revision]);
  const [selectedModule, setSelectedModule] = useState<ModuleId | null>(() => definitions[0]?.id ?? null);
  const [kindFilter, setKindFilter] = useState<'all' | ModuleKind>('all');
  const [transferPending, setTransferPending] = useState<'import' | 'export' | null>(null);
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
  const selectedThought = selectedDefinition ? thoughtRegistry.forModule(selectedDefinition.id) : undefined;
  const filterLabel = kindFilter === 'all' ? t('kinds.all') : kindLabel(t, kindFilter);
  const program = view.selectedProgram ?? engine.modules.compile(tower.slots);

  const quickInstall = (id: ModuleId): void => {
    const empty = tower.slots.findIndex((slot) => slot === null);
    if (empty >= 0) engine.installModule(empty, id);
  };

  const decodeErrorMessage = (reason: OrchestrationDecodeError): string => {
    if (reason === 'invalid-checksum') return t('workshop.importChecksumError');
    if (reason === 'unsupported-version') return t('workshop.importVersionError');
    if (reason === 'unsupported-feature') return t('workshop.importFeatureError');
    if (reason === 'unknown-module') return t('workshop.importModuleError');
    return t('workshop.importFormatError');
  };

  const exportOrchestration = async (): Promise<void> => {
    setTransferPending('export');
    try {
      const writeText = globalThis.navigator.clipboard?.writeText?.bind(globalThis.navigator.clipboard);
      if (!writeText) throw new Error('Clipboard write is unavailable');
      const token = encodeOrchestration({ slots: tower.slots, targeting: tower.targeting });
      await writeText(token);
      onToast?.(t('workshop.exportSuccess'), 'good');
    } catch {
      onToast?.(t('workshop.exportError'), 'warn');
    } finally {
      setTransferPending(null);
    }
  };

  const importOrchestration = async (): Promise<void> => {
    setTransferPending('import');
    try {
      const readText = globalThis.navigator.clipboard?.readText?.bind(globalThis.navigator.clipboard);
      if (!readText) throw new Error('Clipboard read is unavailable');
      const decoded = decodeOrchestration((await readText()).trim());
      if (!decoded.ok) {
        onToast?.(decodeErrorMessage(decoded.reason), 'warn');
        return;
      }
      const applied = engine.applyCreativeOrchestration(decoded.value);
      if (!applied.ok) {
        const message = applied.reason === 'too-many-slots'
          ? t('workshop.importSlotsError', { required: decoded.value.slots.length, available: tower.slots.length })
          : t('workshop.importApplyError');
        onToast?.(message, 'warn');
        return;
      }
      onToast?.(t('workshop.importSuccess'), 'good');
    } catch {
      onToast?.(t('workshop.importClipboardError'), 'warn');
    } finally {
      setTransferPending(null);
    }
  };

  return (
    <aside ref={workshopRef} className="workshop" aria-label={t('workshop.aria')}>
      <div className="workshop-head">
        <h2>{t('workshop.title')} <span>{t('workshop.subtitle')}</span></h2>
        <div className="workshop-head-actions">
          <Tag className="tower-id" tone="yellow">{t('tower.nodeNumber', { id: String(tower.id).padStart(2, '0') })}</Tag>
          <button className="workshop-close" data-tutorial-workshop-close onClick={() => engine.selectTower(null)} aria-label={t('workshop.close')}>×</button>
        </div>
      </div>

      <div className="workshop-body">
        <div className="workshop-side">
          <TowerOverview tower={tower} engine={engine} />
          {selectedDefinition ? <ModuleInspector definition={selectedDefinition} {...(selectedThought && onOpenThought ? { onOpenThought: () => onOpenThought(selectedThought.id) } : {})} /> : null}
        </div>

        <div className="workshop-main">
          <section className="program-section">
            <div className="section-title">
              <div><i className="section-color program-color" aria-hidden="true" /><div className="section-heading"><h3>{t('workshop.arrange')}</h3><small>{t('workshop.leftToRight', { count: tower.slots.length })}</small></div></div>
              <div className="orchestration-actions" aria-busy={transferPending !== null}>
                {engine.rules.scenarioControls === 'creative' ? <>
                  <button className="orchestration-import" onClick={() => void importOrchestration()} disabled={transferPending !== null}>
                    {t('workshop.import')}
                  </button>
                  <button className="orchestration-export" onClick={() => void exportOrchestration()} disabled={transferPending !== null}>
                    {t('workshop.export')}
                  </button>
                </> : null}
                <button className="orchestration-clear" onClick={() => engine.clearLoadout()} disabled={transferPending !== null}>{t('workshop.clear')}</button>
              </div>
            </div>
            <div className="slot-flow" style={{ '--slot-count': tower.slots.length } as CSSProperties}>
              {tower.slots.map((moduleId, index) => (
                <ModuleSlot
                  key={index}
                  index={index}
                  isLast={index === tower.slots.length - 1}
                  definition={moduleId ? engine.modules.get(moduleId) : undefined}
                  selectedModule={selectedModule}
                  onSelectModule={(id) => {
                    const installed = engine.modules.get(id);
                    if (kindFilter !== 'all' && installed?.kind !== kindFilter) setKindFilter('all');
                    setSelectedModule(id);
                  }}
                  engine={engine}
                />
              ))}
            </div>
            <ProgramReadout program={program} engine={engine} maxEnergy={tower.maxEnergy} {...(onOpenThought ? { onOpenThought } : {})} />
          </section>

          <section className="library-section">
            <div className="section-title library-title">
              <div><i className="section-color library-color" aria-hidden="true" /><h3>{filterLabel} · {visibleDefinitions.length}</h3></div>
              <div className="module-filters" aria-label={t('workshop.filterAria')}>
                {([
                  ['all', t('kinds.allShort')],
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
                const exhausted = engine.rules.inventory === 'limited' && available === 0;
                return (
                  <ModuleCard
                    key={definition.id}
                    definition={definition}
                    tutorialId={definition.id}
                    selected={definition.id === selectedModule}
                    exhausted={exhausted}
                    inventoryLabel={engine.rules.inventory === 'limited'
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
