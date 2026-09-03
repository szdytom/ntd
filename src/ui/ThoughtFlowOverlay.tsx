import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { resolveRenderBounds } from '../game/renderer';
import { useTranslation } from 'react-i18next';
import { moduleShortName } from '../i18n/presentation';
import type { ThoughtSceneDirector } from '../thoughts';
import type { ThoughtOverlayTarget, ThoughtPlayerSnapshot } from '../thoughts/types';
import { moduleUiColor } from './modulePresentation';
import './ThoughtFlowOverlay.css';

type OverlayPoint = readonly [number, number];
interface LineGeometry {
  readonly width: number;
  readonly height: number;
  readonly path: string;
  readonly target: OverlayPoint;
}

interface OverlayPosition {
  readonly left: number;
  readonly top: number;
}

const fitLoadoutModule = (element: HTMLDivElement | null): void => {
  if (!element) return;
  const modules = Array.from(element.querySelectorAll<HTMLElement>('.thought-loadout-module'));
  const width = Math.max(0, ...modules.map((module) => module.offsetWidth));
  if (width > 0) element.style.setProperty('--loadout-module-width', `${Math.ceil(width)}px`);
};

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

const overlapArea = (
  left: number,
  top: number,
  width: number,
  height: number,
  obstacle: DOMRect,
  rootBounds: DOMRect,
): number => {
  const obstacleLeft = obstacle.left - rootBounds.left;
  const obstacleTop = obstacle.top - rootBounds.top;
  const overlapWidth = Math.max(0, Math.min(left + width, obstacleLeft + obstacle.width) - Math.max(left, obstacleLeft));
  const overlapHeight = Math.max(0, Math.min(top + height, obstacleTop + obstacle.height) - Math.max(top, obstacleTop));
  return overlapWidth * overlapHeight;
};

const closestPointOnRect = (
  target: OverlayPoint,
  element: HTMLElement,
): OverlayPoint => {
  const left = element.offsetLeft;
  const top = element.offsetTop;
  const right = left + element.offsetWidth;
  const bottom = top + element.offsetHeight;
  const [x, y] = target;
  const candidates: OverlayPoint[] = [
    [Math.max(left, Math.min(right, x)), top],
    [Math.max(left, Math.min(right, x)), bottom],
    [left, Math.max(top, Math.min(bottom, y))],
    [right, Math.max(top, Math.min(bottom, y))],
  ];
  return candidates.reduce((closest, candidate) => (
    Math.hypot(candidate[0] - x, candidate[1] - y) < Math.hypot(closest[0] - x, closest[1] - y)
      ? candidate
      : closest
  ));
};

const elementCenter = (element: Element, root: HTMLElement): OverlayPoint => {
  const bounds = element.getBoundingClientRect();
  const rootBounds = root.getBoundingClientRect();
  return [
    bounds.left - rootBounds.left + bounds.width / 2,
    bounds.top - rootBounds.top + bounds.height / 2,
  ];
};

export function ThoughtFlowOverlay({ director, snapshot }: {
  director: ThoughtSceneDirector;
  snapshot: ThoughtPlayerSnapshot;
}) {
  const { t } = useTranslation();
  const overlay = snapshot.overlay;
  const rootRef = useRef<HTMLDivElement>(null);
  const loadoutRefs = useRef(new Map<number, HTMLDivElement>());
  const compactLoadoutRefs = useRef(new Map<number, HTMLDivElement>());
  const calloutRef = useRef<HTMLElement>(null);
  const [line, setLine] = useState<LineGeometry | null>(null);
  const [calloutPosition, setCalloutPosition] = useState<OverlayPosition | null>(null);
  const [loadoutPositions, setLoadoutPositions] = useState<Record<number, OverlayPosition>>({});
  const [compactPositions, setCompactPositions] = useState<Record<number, OverlayPosition>>({});
  const [placementBurstPosition, setPlacementBurstPosition] = useState<OverlayPosition | null>(null);
  const maskId = `thought-line-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-${snapshot.cueId}`;
  const cueStyle = { '--cue-duration': `${Math.max(0.7, snapshot.cueDuration)}s` } as CSSProperties;
  const slotEntriesFor = (towerIndex: number) => (
    director.runtime.engine.towers[towerIndex]?.slots.flatMap((moduleId, index) => (
      moduleId ? [{ module: director.runtime.engine.modules.require(moduleId), index }] : []
    )) ?? []
  );
  const visibleSlotsFor = (towerIndex: number) => {
    const entries = slotEntriesFor(towerIndex);
    return snapshot.loadoutVisibleRange
      ? entries.slice(
        snapshot.loadoutVisibleRange.start,
        snapshot.loadoutVisibleRange.start + snapshot.loadoutVisibleRange.count,
      )
      : entries.slice(0, snapshot.loadoutVisibleSlots ?? entries.length);
  };
  const registerOverlayRef = (
    refs: Map<number, HTMLDivElement>,
    towerIndex: number,
    element: HTMLDivElement | null,
  ): void => {
    if (element) refs.set(towerIndex, element);
    else refs.delete(towerIndex);
  };

  useLayoutEffect(() => {
    for (const loadout of loadoutRefs.current.values()) {
      loadout.querySelectorAll<HTMLDivElement>('.thought-loadout-module-reveal').forEach(fitLoadoutModule);
    }
  }, [snapshot.cueId, t]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      setLine(null);
      return undefined;
    }
    const resolveWorldPoint = (point: { readonly x: number; readonly y: number }): OverlayPoint => {
      const width = root.clientWidth;
      const height = root.clientHeight;
      const camera = director.definition.scene?.camera ?? { center: { x: 465, y: 530 }, height: 240 };
      const view = resolveRenderBounds(width, height, camera);
      const scale = Math.min(width / view.width, height / view.height);
      return [
        (width - view.width * scale) / 2 + (point.x - view.x) * scale,
        (height - view.height * scale) / 2 + (point.y - view.y) * scale,
      ];
    };
    const resolveTarget = (target: ThoughtOverlayTarget): OverlayPoint => {
      if (typeof target === 'object' && 'slot' in target) {
        const towerIndex = target.towerIndex ?? 0;
        const slot = root.querySelector(`[data-thought-tower="${towerIndex}"] [data-thought-slot="${target.slot}"]`);
        const icon = slot?.querySelector('.thought-loadout-module-icon') ?? slot;
        if (icon) return elementCenter(icon, root);
      }
      if (typeof target === 'object' && 'towerIndex' in target) {
        const tower = director.runtime.engine.towers[target.towerIndex];
        if (tower) return resolveWorldPoint(tower.position);
      }
      if (typeof target === 'object' && 'signalRef' in target) {
        const signal = director.getBoundSignal(target.signalRef);
        if (signal) return resolveWorldPoint(signal.position);
      }
      if (typeof target === 'object' && 'projectileRef' in target) {
        const projectile = director.getBoundProjectile(target.projectileRef);
        if (projectile) return resolveWorldPoint(projectile.position);
      }
      if (typeof target === 'object' && 'projectileGroupRef' in target) {
        const projectiles = director.getBoundProjectileGroup(target.projectileGroupRef);
        if (projectiles.length > 0) {
          const center = projectiles.reduce((sum, projectile) => ({
            x: sum.x + projectile.position.x / projectiles.length,
            y: sum.y + projectile.position.y / projectiles.length,
          }), { x: 0, y: 0 });
          return resolveWorldPoint(center);
        }
      }
      if (typeof target === 'object' && 'trailRef' in target) {
        const trail = director.getBoundTrail(target.trailRef);
        if (trail && trail.points.length > 0) {
          const index = target.anchor === 'start'
            ? 0
            : target.anchor === 'end'
              ? trail.points.length - 1
              : Math.floor((trail.points.length - 1) / 2);
          const point = trail.points[index];
          if (point) return resolveWorldPoint(point);
        }
      }
      if (target === 'signal') {
        const signal = director.runtime.engine.signals.find((candidate) => !candidate.dead);
        if (signal) return resolveWorldPoint(signal.position);
      }
      const tower = director.runtime.engine.towers[0];
      return resolveWorldPoint(tower?.position ?? director.definition.scene?.tower ?? { x: 580, y: 455 });
    };
    const positionCallout = (): void => {
      const callout = calloutRef.current;
      if (overlay?.type !== 'caption' || !callout || root.clientWidth <= 0 || root.clientHeight <= 0) return;
      const target = resolveTarget(overlay.target);
      const width = callout.offsetWidth;
      const height = callout.offsetHeight;
      const margin = Math.min(20, root.clientWidth * 0.03);
      const gap = Math.min(36, root.clientWidth * 0.045);
      const availableWidth = Math.max(0, root.clientWidth - margin * 2);
      const availableHeight = Math.max(0, root.clientHeight - margin * 2);
      const boundedWidth = Math.min(width, availableWidth);
      const boundedHeight = Math.min(height, availableHeight);
      const paragraph = callout.querySelector('p');
      const readingInsetX = paragraph?.offsetLeft ?? 0;
      const readingInsetY = paragraph?.offsetTop ?? 0;
      const rootBounds = root.getBoundingClientRect();
      const obstacles = [...loadoutRefs.current.values(), ...compactLoadoutRefs.current.values()]
        .map((element) => element.getBoundingClientRect());
      const containingObstacle = obstacles.find((obstacle) => (
        target[0] >= obstacle.left - rootBounds.left
        && target[0] <= obstacle.right - rootBounds.left
        && target[1] >= obstacle.top - rootBounds.top
        && target[1] <= obstacle.bottom - rootBounds.top
      ));
      const anchor = containingObstacle
        ? {
          left: containingObstacle.left - rootBounds.left,
          right: containingObstacle.right - rootBounds.left,
          top: containingObstacle.top - rootBounds.top,
          bottom: containingObstacle.bottom - rootBounds.top,
        }
        : { left: target[0], right: target[0], top: target[1], bottom: target[1] };
      const preferredCandidates: readonly OverlayPosition[] = [
        { left: target[0] - readingInsetX, top: anchor.top - boundedHeight - gap },
        { left: target[0] - readingInsetX, top: anchor.bottom + gap },
        { left: anchor.right + gap, top: target[1] - readingInsetY },
      ];
      const fallbackCandidates: readonly OverlayPosition[] = [
        { left: target[0] - boundedWidth + readingInsetX, top: anchor.top - boundedHeight - gap },
        { left: target[0] - boundedWidth + readingInsetX, top: anchor.bottom + gap },
        { left: anchor.left - boundedWidth - gap, top: target[1] - boundedHeight + readingInsetY },
        { left: target[0] - boundedWidth / 2, top: anchor.top - boundedHeight - gap },
        { left: target[0] - boundedWidth / 2, top: anchor.bottom + gap },
      ];
      const overlapFor = (candidate: OverlayPosition): number => obstacles.reduce((sum, obstacle) => (
        sum + overlapArea(candidate.left, candidate.top, boundedWidth, boundedHeight, obstacle, rootBounds)
      ), 0);
      const fits = (candidate: OverlayPosition): boolean => (
        candidate.left >= margin
        && candidate.top >= margin
        && candidate.left + boundedWidth <= root.clientWidth - margin
        && candidate.top + boundedHeight <= root.clientHeight - margin
      );
      const preferred = preferredCandidates.find((candidate) => fits(candidate) && overlapFor(candidate) === 0);
      const candidates = preferred ? [preferred] : [...preferredCandidates, ...fallbackCandidates];
      const ranked = candidates.map((candidate, index) => {
        const left = clamp(candidate.left, margin, root.clientWidth - boundedWidth - margin);
        const top = clamp(candidate.top, margin, root.clientHeight - boundedHeight - margin);
        const displacement = Math.abs(left - candidate.left) + Math.abs(top - candidate.top);
        const overlap = overlapFor({ left, top });
        return { left, top, score: displacement * 100 + (overlap > 0 ? 1_000_000 + overlap * 100 : 0) + index };
      });
      const best = ranked.reduce((current, candidate) => candidate.score < current.score ? candidate : current);
      setCalloutPosition((current) => current?.left === best.left && current.top === best.top
        ? current
        : { left: best.left, top: best.top });
    };
    const positionCompactLoadout = (towerIndex: number, compact: HTMLDivElement): void => {
      if (root.clientWidth <= 0 || root.clientHeight <= 0) return;
      const tower = director.runtime.engine.towers[towerIndex];
      const towerPosition = resolveWorldPoint(tower?.position ?? director.definition.scene?.tower ?? { x: 580, y: 455 });
      const camera = director.definition.scene?.camera ?? { center: { x: 465, y: 530 }, height: 240 };
      const view = resolveRenderBounds(root.clientWidth, root.clientHeight, camera);
      const worldScale = Math.min(root.clientWidth / view.width, root.clientHeight / view.height);
      const towerRadius = 35 * worldScale;
      const gap = 12;
      const margin = 8;
      const left = clamp(towerPosition[0], compact.offsetWidth / 2 + margin, root.clientWidth - compact.offsetWidth / 2 - margin);
      const top = clamp(
        towerPosition[1] + towerRadius + gap + compact.offsetHeight / 2,
        compact.offsetHeight / 2 + margin,
        root.clientHeight - compact.offsetHeight / 2 - margin,
      );
      setCompactPositions((current) => current[towerIndex]?.left === left && current[towerIndex]?.top === top
        ? current
        : { ...current, [towerIndex]: { left, top } });
    };
    const positionLoadoutDialog = (target: ThoughtPlayerSnapshot['loadoutTargets'][number], dialog: HTMLDivElement): void => {
      if (root.clientWidth <= 0 || root.clientHeight <= 0) return;
      const tower = director.runtime.engine.towers[target.towerIndex];
      const towerPosition = resolveWorldPoint(tower?.position ?? director.definition.scene?.tower ?? { x: 580, y: 455 });
      const camera = director.definition.scene?.camera ?? { center: { x: 465, y: 530 }, height: 240 };
      const view = resolveRenderBounds(root.clientWidth, root.clientHeight, camera);
      const worldScale = Math.min(root.clientWidth / view.width, root.clientHeight / view.height);
      const towerRadius = 35 * worldScale;
      const gap = 10;
      const margin = 12;
      const placement = target.placement;
      const horizontal = placement === 'right'
        ? towerPosition[0] + towerRadius + gap
        : placement === 'left'
          ? towerPosition[0] - towerRadius - gap - dialog.offsetWidth
          : placement.endsWith('right')
            ? towerPosition[0] - dialog.offsetWidth * 0.25
            : towerPosition[0] - dialog.offsetWidth * 0.75;
      const vertical = placement === 'right' || placement === 'left'
        ? towerPosition[1] - dialog.offsetHeight / 2
        : placement.startsWith('top')
          ? towerPosition[1] - towerRadius - gap - dialog.offsetHeight
          : towerPosition[1] + towerRadius + gap;
      const left = clamp(
        horizontal,
        margin,
        root.clientWidth - dialog.offsetWidth - margin,
      );
      const top = clamp(
        vertical,
        margin,
        root.clientHeight - dialog.offsetHeight - margin,
      );
      setLoadoutPositions((current) => current[target.towerIndex]?.left === left && current[target.towerIndex]?.top === top
        ? current
        : { ...current, [target.towerIndex]: { left, top } });
    };
    const positionPlacementBurst = (): void => {
      if (!snapshot.placementBurst) return;
      const tower = director.runtime.engine.towers[snapshot.placementBurstTowerIndex];
      if (!tower) return;
      const [left, top] = resolveWorldPoint(tower.position);
      setPlacementBurstPosition((current) => current?.left === left && current.top === top ? current : { left, top });
    };
    const update = (): void => {
      if (!overlay) {
        setLine(null);
        return;
      }
      if (overlay.type === 'loadout' || overlay.type === 'loadouts') {
        setLine(null);
        return;
      }
      const destinationElement = calloutRef.current;
      if (!destinationElement) {
        setLine(null);
        return;
      }
      const target = resolveTarget(overlay.target);
      const destination = closestPointOnRect(target, destinationElement);
      const nextLine = {
        width: root.clientWidth,
        height: root.clientHeight,
        path: `M ${target[0]} ${target[1]} L ${destination[0]} ${destination[1]}`,
        target,
      } as const;
      setLine((current) => (
        current?.width === nextLine.width
        && current.height === nextLine.height
        && current.path === nextLine.path
          ? current
          : nextLine
      ));
    };
    let frame = 0;
    const animate = (): void => {
      update();
      frame = requestAnimationFrame(animate);
    };
    const positionOverlays = (): void => {
      for (const target of snapshot.loadoutTargets) {
        const loadout = loadoutRefs.current.get(target.towerIndex);
        if (loadout) positionLoadoutDialog(target, loadout);
        const compact = compactLoadoutRefs.current.get(target.towerIndex);
        if (compact) positionCompactLoadout(target.towerIndex, compact);
      }
      positionPlacementBurst();
      positionCallout();
    };
    positionOverlays();
    frame = requestAnimationFrame(animate);
    let layoutFrame = requestAnimationFrame(positionOverlays);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      positionOverlays();
      cancelAnimationFrame(layoutFrame);
      layoutFrame = requestAnimationFrame(positionOverlays);
      update();
    });
    observer?.observe(root);
    for (const loadout of loadoutRefs.current.values()) observer?.observe(loadout);
    if (calloutRef.current) observer?.observe(calloutRef.current);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(layoutFrame);
      observer?.disconnect();
    };
  }, [director, overlay, snapshot.cueId, snapshot.loadoutMode, snapshot.loadoutPlacement, snapshot.loadoutTargets]);

  return <div ref={rootRef} className="thought-scene-overlay" data-cue={snapshot.cueId} style={cueStyle}>
    {snapshot.placementBurst ? <div className="thought-placement-burst" style={placementBurstPosition ?? undefined} aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--particle-index': index } as CSSProperties} />)}
    </div> : null}

    {snapshot.loadoutMode === 'dialog' || snapshot.loadoutMode === 'dialog-leaving'
      ? snapshot.loadoutTargets.map((target) => <div
        ref={(element) => registerOverlayRef(loadoutRefs.current, target.towerIndex, element)}
        className={`thought-loadout-dialog ${snapshot.loadoutMode === 'dialog-leaving' ? 'leaving' : ''}`}
        data-placement={target.placement}
        data-thought-tower={target.towerIndex}
        style={loadoutPositions[target.towerIndex]}
        aria-label={t('thoughtIndex.installedModules')}
        key={`loadout-${target.towerIndex}`}
      >
        {visibleSlotsFor(target.towerIndex).map(({ module, index }) => {
          const Icon = module.icon;
          const replacement = snapshot.loadoutReplacements.find((candidate) => (
            candidate.towerIndex === target.towerIndex && candidate.slot === index
          ));
          const previousModule = replacement
            ? director.runtime.engine.modules.require(replacement.from)
            : null;
          const PreviousIcon = previousModule?.icon;
          const activeClass = snapshot.highlightSlots.includes(index) ? ' active' : '';
          return <div
            ref={fitLoadoutModule}
            data-thought-slot={index}
            className={`thought-loadout-module-reveal${replacement ? ' replacing' : ''}`}
            key={`loadout-slot-${index}`}
          >
            {previousModule && PreviousIcon ? <div
              className="thought-loadout-module thought-loadout-module--outgoing"
              style={{ '--chip-color': moduleUiColor(previousModule), '--chip-tint': previousModule.meta.tint } as CSSProperties}
              aria-hidden="true"
            >
              <span className="thought-loadout-module-icon"><PreviousIcon /></span><strong>{moduleShortName(t, previousModule.id)}</strong>
            </div> : null}
            <div
              className={`thought-loadout-module${activeClass}${replacement ? ' thought-loadout-module--incoming' : ''}`}
              style={{ '--chip-color': moduleUiColor(module), '--chip-tint': module.meta.tint } as CSSProperties}
            >
              <span className="thought-loadout-module-icon"><Icon /></span><strong>{moduleShortName(t, module.id)}</strong>
            </div>
          </div>;
        })}
      </div>)
      : null}

    {snapshot.loadoutMode === 'compact' || snapshot.loadoutMode === 'compact-leaving'
      ? snapshot.loadoutTargets.map((target) => <div
        ref={(element) => registerOverlayRef(compactLoadoutRefs.current, target.towerIndex, element)}
        className={`thought-compact-loadout ${snapshot.loadoutMode === 'compact-leaving' ? 'leaving' : ''}`}
        data-thought-tower={target.towerIndex}
        style={compactPositions[target.towerIndex]}
        aria-label={t('thoughtIndex.installedModules')}
        key={`compact-loadout-${target.towerIndex}`}
      >
        {slotEntriesFor(target.towerIndex).map(({ module, index }) => {
          const Icon = module.icon;
          return <span
            key={`${module.id}-${index}`}
            data-thought-slot={index}
            className={snapshot.highlightSlots.includes(index) ? 'active' : undefined}
            style={{ '--chip-color': moduleUiColor(module) } as CSSProperties}
          ><Icon /></span>;
        })}
      </div>)
      : null}

    {line ? <svg key={`line-${snapshot.cueId}`} className="thought-overlay-line" viewBox={`0 0 ${line.width} ${line.height}`} aria-hidden="true">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width={line.width} height={line.height}>
          <rect width={line.width} height={line.height} fill="#000" />
          <path className="thought-line-reveal" d={line.path} pathLength="1" />
        </mask>
      </defs>
      <path className="thought-line-dashes" d={line.path} mask={`url(#${maskId})`} />
      <rect className="thought-line-target" x={line.target[0] - 6} y={line.target[1] - 6} width="12" height="12" rx="1" />
    </svg> : null}

    {overlay?.type === 'caption' ? <section
      ref={calloutRef}
      key={`caption-${snapshot.cueId}`}
      className="thought-scene-callout"
      style={calloutPosition ?? undefined}
      aria-live="polite"
    >
      <p>{t(overlay.textKey)}</p>
      {snapshot.comparisonKey ? <strong>{t(snapshot.comparisonKey)}</strong> : null}
    </section> : null}

    {snapshot.error ? <section className="thought-scene-callout thought-scene-error" role="alert">
      <p>{t('thoughtIndex.sceneError')}</p>
    </section> : null}
  </div>;
}
