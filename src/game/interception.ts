import { distance } from './math';
import type { PathSampler } from './path';
import type { Point } from './types';

const MIN_SPEED = 1e-6;
const ROOT_ITERATIONS = 18;
const MIN_SAMPLES = 12;
const MAX_SAMPLES = 72;

export interface PathInterceptionOptions {
  origin: Point;
  path: PathSampler;
  projectileSpeed: number;
  projectileLifetime: number;
  launchOffset?: number;
  targetDistance: number;
  targetSpeed: number;
  targetSlowFactor?: number;
  targetSlowTime?: number;
}

export interface PathInterception {
  position: Point;
  time: number;
}

const targetTravelAtTime = (
  time: number,
  speed: number,
  slowFactor: number,
  slowTime: number,
): number => {
  const slowedTime = Math.min(time, slowTime);
  return speed * (1 - slowFactor) * slowedTime + speed * (time - slowedTime);
};

const timeToTravel = (
  remainingDistance: number,
  speed: number,
  slowFactor: number,
  slowTime: number,
): number => {
  if (remainingDistance <= 0) return 0;
  if (speed <= MIN_SPEED) return Number.POSITIVE_INFINITY;

  const slowedSpeed = speed * (1 - slowFactor);
  const slowedDistance = slowedSpeed * slowTime;
  if (slowedSpeed > MIN_SPEED && remainingDistance <= slowedDistance) {
    return remainingDistance / slowedSpeed;
  }
  return slowTime + (remainingDistance - slowedDistance) / speed;
};

/** Finds the first point where a projectile can meet a target moving along the level path. */
export function findPathInterception(options: PathInterceptionOptions): PathInterception | null {
  const {
    origin,
    path,
    projectileSpeed,
    projectileLifetime,
    targetDistance,
    targetSpeed,
  } = options;
  if (projectileSpeed <= MIN_SPEED || projectileLifetime <= 0) return null;

  const launchOffset = Math.max(0, options.launchOffset ?? 0);
  const slowFactor = Math.max(0, Math.min(1, options.targetSlowFactor ?? 0));
  const slowTime = Math.max(0, options.targetSlowTime ?? 0);
  const remainingPath = Math.max(0, path.length - targetDistance);
  const availableTime = Math.min(
    projectileLifetime,
    timeToTravel(remainingPath, targetSpeed, slowFactor, slowTime),
  );
  if (availableTime <= 0) return null;

  const targetAtTime = (time: number): Point => path.pointAtDistance(
    targetDistance + targetTravelAtTime(time, targetSpeed, slowFactor, slowTime),
  ).position;
  const gapAtTime = (time: number): number => (
    Math.max(0, distance(origin, targetAtTime(time)) - launchOffset) - projectileSpeed * time
  );

  if (gapAtTime(0) <= 0) return { position: targetAtTime(0), time: 0 };

  const sampleCount = Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, Math.ceil(availableTime * 30)));
  let lowerTime = 0;
  let upperTime: number | null = null;
  for (let sample = 1; sample <= sampleCount; sample += 1) {
    const time = availableTime * sample / sampleCount;
    if (gapAtTime(time) <= 0) {
      upperTime = time;
      break;
    }
    lowerTime = time;
  }
  if (upperTime === null) return null;

  let interceptTime = upperTime;
  for (let iteration = 0; iteration < ROOT_ITERATIONS; iteration += 1) {
    const midpoint = (lowerTime + interceptTime) / 2;
    if (gapAtTime(midpoint) <= 0) interceptTime = midpoint;
    else lowerTime = midpoint;
  }

  return {
    position: targetAtTime(interceptTime),
    time: interceptTime,
  };
}
