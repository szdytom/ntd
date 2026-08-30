import type { CSSProperties, ReactNode } from 'react';
import { ENEMIES } from '../game/config';
import { ANVIL_SHAPE, FRACTURE_SHAPE, fractureSpikeAngles, fractureSpikePoints, regularPolygonPoints, surgeBodyPoints } from '../game/enemy-shapes';
import type { EnemyType } from '../game/types';
import './SignalIcon.css';

const BODY_RADIUS = 13;

function pointList(points: readonly { x: number; y: number }[]): string {
  return points.map(({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
}

function regularPolygon(radius: number, sides: number, rotation: number): string {
  return pointList(regularPolygonPoints(radius, sides, rotation));
}

function regularBody(type: EnemyType): ReactNode {
  const config = ENEMIES[type];
  const rotation = type === 'spark' ? Math.PI / 2 : type === 'kite' ? Math.PI / 4 : 0;
  return <>
    {type === 'crown' ? <polygon className="signal-icon__crown-orbit" points={regularPolygon(17, 8, Math.PI / 8)} /> : null}
    <polygon className="signal-icon__body" points={regularPolygon(BODY_RADIUS, config.sides, rotation)} />
    {type === 'hex' || type === 'crown'
      ? <polygon className="signal-icon__detail-outline" points={regularPolygon(BODY_RADIUS * .48, config.sides, 0)} />
      : null}
  </>;
}

function fractureBody(): ReactNode {
  return <>
    {fractureSpikeAngles().map((angle) => (
      <polygon className="signal-icon__fracture-spike" key={angle} points={pointList(fractureSpikePoints(BODY_RADIUS, angle))} />
    ))}
    <circle className="signal-icon__fracture-core" r={BODY_RADIUS * FRACTURE_SHAPE.coreRadiusScale} />
    <circle className="signal-icon__detail-outline" r={BODY_RADIUS * .38} />
    <circle className="signal-icon__detail-fill" r={BODY_RADIUS * .12} />
  </>;
}

function anvilBody(): ReactNode {
  return <>
    <polygon className="signal-icon__anvil-shell" points={regularPolygon(BODY_RADIUS, ANVIL_SHAPE.sides, 0)} />
    <polygon className="signal-icon__anvil-plate" points={regularPolygon(BODY_RADIUS * ANVIL_SHAPE.plateRadiusScale, ANVIL_SHAPE.sides, 0)} />
    {Array.from({ length: ANVIL_SHAPE.sides }, (_, index) => {
      const angle = index * Math.PI * 2 / ANVIL_SHAPE.sides;
      return <line
        className="signal-icon__anvil-groove"
        key={angle}
        x1={Math.cos(angle) * BODY_RADIUS * ANVIL_SHAPE.grooveStartRadiusScale}
        y1={Math.sin(angle) * BODY_RADIUS * ANVIL_SHAPE.grooveStartRadiusScale}
        x2={Math.cos(angle) * BODY_RADIUS * ANVIL_SHAPE.grooveEndRadiusScale}
        y2={Math.sin(angle) * BODY_RADIUS * ANVIL_SHAPE.grooveEndRadiusScale}
      />;
    })}
    <polygon className="signal-icon__anvil-core" points={regularPolygon(BODY_RADIUS * ANVIL_SHAPE.coreRadiusScale, ANVIL_SHAPE.sides, Math.PI)} />
  </>;
}

function ringBody(): ReactNode {
  return <>
    <circle className="signal-icon__body" r={BODY_RADIUS} />
    <circle className="signal-icon__ring-cutout" r={BODY_RADIUS * .48} />
    {Array.from({ length: 3 }, (_, index) => {
      const angle = index * Math.PI * 2 / 3;
      return <circle
        className="signal-icon__detail-fill"
        key={angle}
        cx={Math.cos(angle) * BODY_RADIUS * .72}
        cy={Math.sin(angle) * BODY_RADIUS * .72}
        r={BODY_RADIUS * .13}
      />;
    })}
  </>;
}

function signalBody(type: EnemyType): ReactNode {
  const shape = ENEMIES[type].shape;
  if (shape === 'fracture') return fractureBody();
  if (shape === 'anvil') return anvilBody();
  if (shape === 'ring') return ringBody();
  if (shape === 'surge') return <polygon className="signal-icon__body" points={pointList(surgeBodyPoints(BODY_RADIUS))} />;
  return regularBody(type);
}

export function SignalIcon({ type, monochrome = false, className = '' }: {
  type: EnemyType;
  monochrome?: boolean;
  className?: string;
}) {
  const color = ENEMIES[type].color;
  const style = {
    '--signal-icon-fill': monochrome ? '#fff' : color,
    '--signal-icon-detail': monochrome ? color : '#fff',
    '--signal-icon-dark': monochrome ? color : '#5f451c',
    '--signal-icon-accent': monochrome ? '#fff' : '#ffcf4a',
  } as CSSProperties;
  return <svg
    className={`signal-icon ${monochrome ? 'signal-icon--monochrome' : ''} ${className}`.trim()}
    data-signal-type={type}
    viewBox="-18 -18 36 36"
    aria-hidden="true"
    focusable="false"
    style={style}
  >{signalBody(type)}</svg>;
}
