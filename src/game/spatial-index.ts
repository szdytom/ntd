import type { Signal, Point } from './types';

const NO_EXCLUDED_SIGNALS: readonly number[] = [];

interface SignalCell {
  x: number;
  y: number;
  signals: Signal[];
}

interface IndexedSignal {
  signal: Signal;
  cell: SignalCell;
  index: number;
}

export class SignalSpatialIndex {
  private readonly columns = new Map<number, Map<number, SignalCell>>();
  private readonly indexedEnemies = new Map<number, IndexedSignal>();

  constructor(private readonly cellSize = 128) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('cellSize must be positive');
  }

  rebuild(signals: readonly Signal[]): void {
    this.clear();
    for (const signal of signals) this.update(signal);
  }

  update(signal: Signal): boolean {
    const indexed = this.indexedEnemies.get(signal.id);
    if (signal.dead) return indexed ? this.remove(signal.id) : false;

    const cellX = this.coordinate(signal.position.x);
    const cellY = this.coordinate(signal.position.y);
    if (
      indexed &&
      indexed.signal === signal &&
      indexed.cell.x === cellX &&
      indexed.cell.y === cellY
    ) {
      return false;
    }

    if (indexed) this.detach(indexed);
    const cell = this.getOrCreateCell(cellX, cellY);
    const next = indexed ?? { signal, cell, index: 0 };
    next.signal = signal;
    next.cell = cell;
    next.index = cell.signals.length;
    cell.signals.push(signal);
    this.indexedEnemies.set(signal.id, next);
    return true;
  }

  remove(signalId: number): boolean {
    const indexed = this.indexedEnemies.get(signalId);
    if (!indexed) return false;
    this.detach(indexed);
    this.indexedEnemies.delete(signalId);
    return true;
  }

  clear(): void {
    this.columns.clear();
    this.indexedEnemies.clear();
  }

  withinRadius(position: Point, radius: number, excludeIds: readonly number[] = NO_EXCLUDED_SIGNALS): Signal[] {
    return this.collectWithinRadius(position, radius, [], excludeIds);
  }

  collectWithinRadius(
    position: Point,
    radius: number,
    result: Signal[],
    excludeIds: readonly number[] | number = NO_EXCLUDED_SIGNALS,
  ): Signal[] {
    result.length = 0;
    if (radius < 0) return result;
    const radiusSquared = radius * radius;
    this.collectBounds(
      position.x - radius,
      position.y - radius,
      position.x + radius,
      position.y + radius,
      result,
    );
    let writeIndex = 0;
    for (let index = 0; index < result.length; index += 1) {
      const signal = result[index];
      if (!signal || signal.dead) continue;
      const excluded = typeof excludeIds === 'number'
        ? signal.id === excludeIds
        : excludeIds.includes(signal.id);
      if (excluded) continue;
      const dx = signal.position.x - position.x;
      const dy = signal.position.y - position.y;
      if (dx * dx + dy * dy > radiusSquared) continue;
      result[writeIndex] = signal;
      writeIndex += 1;
    }
    result.length = writeIndex;
    return result;
  }

  nearestWithinRadius(position: Point, radius: number, excludeIds: readonly number[] = NO_EXCLUDED_SIGNALS): Signal[] {
    return this.withinRadius(position, radius, excludeIds).sort((left, right) => {
      const leftX = left.position.x - position.x;
      const leftY = left.position.y - position.y;
      const rightX = right.position.x - position.x;
      const rightY = right.position.y - position.y;
      return leftX * leftX + leftY * leftY - rightX * rightX - rightY * rightY;
    });
  }

  findNearestWithinRadius(
    position: Point,
    radius: number,
    excludeIds: readonly number[] = NO_EXCLUDED_SIGNALS,
  ): Signal | null {
    if (radius < 0) return null;
    const radiusSquared = radius * radius;
    let nearest: Signal | null = null;
    let nearestDistanceSquared = radiusSquared;
    const minCellX = this.coordinate(position.x - radius);
    const maxCellX = this.coordinate(position.x + radius);
    const minCellY = this.coordinate(position.y - radius);
    const maxCellY = this.coordinate(position.y + radius);
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const column = this.columns.get(cellX);
      if (!column) continue;
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const cell = column.get(cellY);
        if (!cell) continue;
        for (const signal of cell.signals) {
          if (signal.dead || excludeIds.includes(signal.id)) continue;
          const dx = signal.position.x - position.x;
          const dy = signal.position.y - position.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared <= radiusSquared && (!nearest || distanceSquared < nearestDistanceSquared)) {
            nearest = signal;
            nearestDistanceSquared = distanceSquared;
          }
        }
      }
    }
    return nearest;
  }

  countWithinRadius(position: Point, radius: number): number {
    if (radius < 0) return 0;
    const radiusSquared = radius * radius;
    let count = 0;
    const minCellX = this.coordinate(position.x - radius);
    const maxCellX = this.coordinate(position.x + radius);
    const minCellY = this.coordinate(position.y - radius);
    const maxCellY = this.coordinate(position.y + radius);
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const column = this.columns.get(cellX);
      if (!column) continue;
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const cell = column.get(cellY);
        if (!cell) continue;
        for (const signal of cell.signals) {
          if (signal.dead) continue;
          const dx = signal.position.x - position.x;
          const dy = signal.position.y - position.y;
          if (dx * dx + dy * dy <= radiusSquared) count += 1;
        }
      }
    }
    return count;
  }

  alongSegment(start: Point, end: Point, padding: number): Signal[] {
    return this.collectAlongSegment(start, end, padding, []);
  }

  collectAlongSegment(start: Point, end: Point, padding: number, result: Signal[]): Signal[] {
    result.length = 0;
    this.collectBounds(
      Math.min(start.x, end.x) - padding,
      Math.min(start.y, end.y) - padding,
      Math.max(start.x, end.x) + padding,
      Math.max(start.y, end.y) + padding,
      result,
    );
    let writeIndex = 0;
    for (let index = 0; index < result.length; index += 1) {
      const signal = result[index];
      if (!signal || signal.dead) continue;
      result[writeIndex] = signal;
      writeIndex += 1;
    }
    result.length = writeIndex;
    return result;
  }

  private collectBounds(minX: number, minY: number, maxX: number, maxY: number, result: Signal[]): void {
    const minCellX = this.coordinate(minX);
    const maxCellX = this.coordinate(maxX);
    const minCellY = this.coordinate(minY);
    const maxCellY = this.coordinate(maxY);
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const column = this.columns.get(cellX);
      if (!column) continue;
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        const cell = column.get(cellY);
        if (!cell) continue;
        for (const signal of cell.signals) result.push(signal);
      }
    }
  }

  private getOrCreateCell(cellX: number, cellY: number): SignalCell {
    let column = this.columns.get(cellX);
    if (!column) {
      column = new Map<number, SignalCell>();
      this.columns.set(cellX, column);
    }
    let cell = column.get(cellY);
    if (!cell) {
      cell = { x: cellX, y: cellY, signals: [] };
      column.set(cellY, cell);
    }
    return cell;
  }

  private detach(indexed: IndexedSignal): void {
    const { cell, index } = indexed;
    const lastIndex = cell.signals.length - 1;
    const replacement = cell.signals[lastIndex];
    if (index < lastIndex && replacement) {
      cell.signals[index] = replacement;
      const replacementIndex = this.indexedEnemies.get(replacement.id);
      if (replacementIndex) replacementIndex.index = index;
    }
    cell.signals.pop();
    if (cell.signals.length > 0) return;
    const column = this.columns.get(cell.x);
    column?.delete(cell.y);
    if (column?.size === 0) this.columns.delete(cell.x);
  }

  private coordinate(value: number): number {
    return Math.floor(value / this.cellSize);
  }
}
