import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveRenderBounds } from '@prism-bastion/web-shared/game/renderer';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { Point, Tower } from '@prism-bastion/game-core/game/types';
import { moduleName } from '@prism-bastion/web-shared/i18n/presentation';
import { moduleUiColor } from '@prism-bastion/web-shared/ui/modulePresentation';
import { modulePresentationRegistry } from '@prism-bastion/web-shared/module-presentations';
import styles from './TowerLoadoutOverlay.module.css';

interface OverlayViewport {
  readonly width: number;
  readonly height: number;
}

export function worldPointToBattlefieldOverlay(
  viewport: OverlayViewport,
  point: Point,
): Point {
  const view = resolveRenderBounds(viewport.width, viewport.height);
  const scale = Math.min(viewport.width / view.width, viewport.height / view.height);
  return {
    x: (viewport.width - view.width * scale) / 2 + (point.x - view.x) * scale,
    y: (viewport.height - view.height * scale) / 2 + (point.y - view.y) * scale,
  };
}

export function TowerLoadoutOverlay({ engine, towers }: {
  engine: GameEngine;
  towers: readonly Tower[];
}) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<OverlayViewport>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const measure = (): void => {
      const bounds = root.getBoundingClientRect();
      setViewport((current) => current.width === bounds.width && current.height === bounds.height
        ? current
        : { width: bounds.width, height: bounds.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return <div
    ref={rootRef}
    className={styles.overlay}
    data-ready={viewport.width > 0 && viewport.height > 0 || undefined}
  >
    {towers.map((tower) => {
      const modules = tower.slots.flatMap((moduleId, slotIndex) => {
        if (!moduleId) return [];
        const definition = engine.modules.get(moduleId);
        return definition ? [{ definition, slotIndex }] : [];
      });
      if (modules.length === 0) return null;
      const position = worldPointToBattlefieldOverlay(viewport, tower.position);
      return <div
        className={styles.loadout}
        data-coop-tower-loadout={tower.id}
        role="group"
        aria-label={t('thoughtIndex.installedModules')}
        style={{ left: position.x, top: position.y }}
        key={tower.id}
      >
        {modules.map(({ definition, slotIndex }) => {
          const Icon = modulePresentationRegistry.require(definition.id).icon;
          return <span
            className={styles.module}
            data-module-id={definition.id}
            data-slot-index={slotIndex}
            role="img"
            aria-label={moduleName(t, definition.id)}
            style={{ '--module-color': moduleUiColor(definition) } as CSSProperties}
            key={`${slotIndex}:${definition.id}`}
          ><Icon /></span>;
        })}
      </div>;
    })}
  </div>;
}
