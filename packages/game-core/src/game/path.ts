import type { Point } from './types';

export type NodeId = string;

export interface GraphNode {
  readonly id: NodeId;
  readonly position: Point;
  readonly parent: NodeId | null;
  readonly children: readonly NodeId[];
}

export interface GraphEdge {
  readonly from: NodeId;
  readonly to: NodeId;
  readonly length: number;
}

export interface RouteMap {
  readonly nodes: ReadonlyMap<NodeId, GraphNode>;
  readonly edges: readonly GraphEdge[];
  readonly entrances: readonly NodeId[];
  readonly root: NodeId;
  lengthToNode(id: NodeId): number;
}

export interface RouteNodeInput {
  readonly id: NodeId;
  readonly position: Point;
  readonly parent: NodeId | null;
}

export interface PathSampler {
  readonly length: number;
  pointAtDistance(distance: number): { position: Point; angle: number };
  sampleInto(distance: number, position: Point): number;
  nearestDistance(point: Point): number;
  centerlineIntersectionTime(start: Point, end: Point): number | null;
}

export function createRouteMap(
  nodeInputs: readonly RouteNodeInput[],
  declaredEntrances?: readonly NodeId[],
): RouteMap {
  if (nodeInputs.length < 2) throw new Error('A route map requires at least two nodes');
  const inputById = new Map<NodeId, RouteNodeInput>();
  for (const input of nodeInputs) {
    if (!input.id) throw new Error('Every route node requires an id');
    if (inputById.has(input.id)) throw new Error(`Duplicate route node: ${input.id}`);
    inputById.set(input.id, input);
  }

  const roots = nodeInputs.filter((node) => node.parent === null);
  if (roots.length !== 1) throw new Error('A route map requires exactly one root');
  const root = roots[0]?.id;
  if (!root) throw new Error('A route map requires a root');

  const children = new Map<NodeId, NodeId[]>();
  for (const node of nodeInputs) children.set(node.id, []);
  for (const node of nodeInputs) {
    if (node.parent === null) continue;
    if (node.parent === node.id) throw new Error(`Route node cannot parent itself: ${node.id}`);
    const parent = inputById.get(node.parent);
    if (!parent) throw new Error(`Unknown parent ${node.parent} for route node ${node.id}`);
    children.get(parent.id)?.push(node.id);
  }

  const distanceCache = new Map<NodeId, number>();
  const visiting = new Set<NodeId>();
  const distanceToRoot = (id: NodeId): number => {
    const cached = distanceCache.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) throw new Error(`Route map contains a cycle at ${id}`);
    const node = inputById.get(id);
    if (!node) throw new Error(`Unknown route node: ${id}`);
    if (node.parent === null) {
      distanceCache.set(id, 0);
      return 0;
    }
    visiting.add(id);
    const parent = inputById.get(node.parent);
    if (!parent) throw new Error(`Unknown parent ${node.parent} for route node ${id}`);
    const edgeLength = Math.hypot(parent.position.x - node.position.x, parent.position.y - node.position.y);
    if (edgeLength <= Number.EPSILON) throw new Error(`Route edge ${id} -> ${parent.id} has zero length`);
    const result = edgeLength + distanceToRoot(parent.id);
    visiting.delete(id);
    distanceCache.set(id, result);
    return result;
  };
  for (const node of nodeInputs) distanceToRoot(node.id);

  const entrances = declaredEntrances
    ? [...declaredEntrances]
    : nodeInputs.filter((node) => (children.get(node.id)?.length ?? 0) === 0).map((node) => node.id);
  if (entrances.length === 0) throw new Error('A route map requires at least one entrance');
  if (new Set(entrances).size !== entrances.length) throw new Error('Route map entrances must be unique');
  for (const entrance of entrances) {
    if (!inputById.has(entrance)) throw new Error(`Unknown route entrance: ${entrance}`);
    if ((children.get(entrance)?.length ?? 0) > 0) throw new Error(`Route entrance must be a leaf: ${entrance}`);
    if (entrance === root) throw new Error('The route root cannot also be an entrance');
  }

  const nodes = new Map<NodeId, GraphNode>();
  for (const input of nodeInputs) {
    nodes.set(input.id, {
      id: input.id,
      position: { ...input.position },
      parent: input.parent,
      children: [...(children.get(input.id) ?? [])],
    });
  }
  const edges = nodeInputs.flatMap((node): GraphEdge[] => {
    if (node.parent === null) return [];
    const parent = inputById.get(node.parent);
    if (!parent) return [];
    return [{
      from: node.id,
      to: parent.id,
      length: Math.hypot(parent.position.x - node.position.x, parent.position.y - node.position.y),
    }];
  });

  return {
    nodes,
    edges,
    entrances,
    root,
    lengthToNode: distanceToRoot,
  };
}

export function legacyPathToGraph(path: readonly Point[], prefix = 'route'): RouteMap {
  if (path.length < 2) throw new Error('A level path requires at least two points');
  return createRouteMap(path.map((position, index) => ({
    id: `${prefix}:${index}`,
    position,
    parent: index === path.length - 1 ? null : `${prefix}:${index + 1}`,
  })), [`${prefix}:0`]);
}

export function resolveRoute(map: RouteMap, entrance: NodeId): PathSampler {
  if (!map.entrances.includes(entrance)) throw new Error(`Unknown route entrance: ${entrance}`);
  const points: Point[] = [];
  const visited = new Set<NodeId>();
  let current: NodeId | null = entrance;
  while (current !== null) {
    if (visited.has(current)) throw new Error(`Route map contains a cycle at ${current}`);
    visited.add(current);
    const node = map.nodes.get(current);
    if (!node) throw new Error(`Unknown route node: ${current}`);
    points.push(node.position);
    current = node.parent;
  }
  return createPathSampler(points);
}

export function createPathSampler(path: readonly Point[]): PathSampler {
  if (path.length < 2) throw new Error('A level path requires at least two points');
  const segments: Array<{ start: Point; end: Point; length: number }> = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const point = path[index];
    const end = path[index + 1];
    if (!point || !end) continue;
    const segmentLength = Math.hypot(end.x - point.x, end.y - point.y);
    if (segmentLength <= Number.EPSILON) continue;
    segments.push({
      start: point,
      end,
      length: segmentLength,
    });
  }
  if (segments.length === 0) throw new Error('A level path requires at least one non-zero segment');
  const length = segments.reduce((sum, segment) => sum + segment.length, 0);
  const sampleInto = (distance: number, position: Point): number => {
    let remaining = Math.max(0, distance);
    for (const segment of segments) {
      if (remaining <= segment.length) {
        const progress = remaining / segment.length;
        position.x = segment.start.x + (segment.end.x - segment.start.x) * progress;
        position.y = segment.start.y + (segment.end.y - segment.start.y) * progress;
        return Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x);
      }
      remaining -= segment.length;
    }
    const last = segments[segments.length - 1];
    if (!last) throw new Error('Path sampler has no segments');
    position.x = last.end.x;
    position.y = last.end.y;
    return Math.atan2(last.end.y - last.start.y, last.end.x - last.start.x);
  };
  return {
    length,
    pointAtDistance(distance) {
      const position = { x: 0, y: 0 };
      return { position, angle: sampleInto(distance, position) };
    },
    sampleInto,
    nearestDistance(point) {
      let bestDistanceSquared = Number.POSITIVE_INFINITY;
      let bestPathDistance = 0;
      let traversed = 0;
      for (const segment of segments) {
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const lengthSquared = segment.length * segment.length;
        const projection = Math.max(0, Math.min(1,
          ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared,
        ));
        const nearestX = segment.start.x + dx * projection;
        const nearestY = segment.start.y + dy * projection;
        const distanceSquared = (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2;
        if (distanceSquared < bestDistanceSquared) {
          bestDistanceSquared = distanceSquared;
          bestPathDistance = traversed + segment.length * projection;
        }
        traversed += segment.length;
      }
      return bestPathDistance;
    },
    centerlineIntersectionTime(start, end) {
      const movementX = end.x - start.x;
      const movementY = end.y - start.y;
      const movementLengthSquared = movementX * movementX + movementY * movementY;
      if (movementLengthSquared <= Number.EPSILON) return null;
      const epsilon = 1e-9;
      let firstInterior: number | null = null;
      let firstBoundary: number | null = null;
      for (const segment of segments) {
        const pathX = segment.end.x - segment.start.x;
        const pathY = segment.end.y - segment.start.y;
        const denominator = movementX * pathY - movementY * pathX;
        if (Math.abs(denominator) <= epsilon) continue;
        const offsetX = segment.start.x - start.x;
        const offsetY = segment.start.y - start.y;
        const movementTime = (offsetX * pathY - offsetY * pathX) / denominator;
        const pathTime = (offsetX * movementY - offsetY * movementX) / denominator;
        if (
          movementTime < -epsilon || movementTime > 1 + epsilon ||
          pathTime < -epsilon || pathTime > 1 + epsilon
        ) continue;
        const clampedTime = Math.max(0, Math.min(1, movementTime));
        if (clampedTime > epsilon && clampedTime < 1 - epsilon) {
          if (firstInterior === null || clampedTime < firstInterior) firstInterior = clampedTime;
        } else if (firstBoundary === null || clampedTime < firstBoundary) {
          firstBoundary = clampedTime;
        }
      }
      return firstInterior ?? firstBoundary;
    },
  };
}
