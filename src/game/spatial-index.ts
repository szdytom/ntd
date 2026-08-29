import type { Enemy, Point } from './types';

const NO_EXCLUDED_ENEMIES: readonly number[] = [];

export class EnemySpatialIndex {
  private readonly columns = new Map<number, Map<number, Enemy[]>>();
  private readonly occupiedCells: Enemy[][] = [];

  constructor(private readonly cellSize = 128) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('cellSize must be positive');
  }

  rebuild(enemies: readonly Enemy[]): void {
    for (const cell of this.occupiedCells) cell.length = 0;
    this.occupiedCells.length = 0;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const cellX = this.coordinate(enemy.position.x);
      const cellY = this.coordinate(enemy.position.y);
      let column = this.columns.get(cellX);
      if (!column) {
        column = new Map<number, Enemy[]>();
        this.columns.set(cellX, column);
      }
      let cell = column.get(cellY);
      if (!cell) {
        cell = [];
        column.set(cellY, cell);
      }
      if (cell.length === 0) this.occupiedCells.push(cell);
      cell.push(enemy);
    }
  }

  withinRadius(position: Point, radius: number, excludeIds: readonly number[] = NO_EXCLUDED_ENEMIES): Enemy[] {
    return this.collectWithinRadius(position, radius, [], excludeIds);
  }

  collectWithinRadius(
    position: Point,
    radius: number,
    result: Enemy[],
    excludeIds: readonly number[] | number = NO_EXCLUDED_ENEMIES,
  ): Enemy[] {
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
      const enemy = result[index];
      if (!enemy || enemy.dead) continue;
      const excluded = typeof excludeIds === 'number'
        ? enemy.id === excludeIds
        : excludeIds.includes(enemy.id);
      if (excluded) continue;
      const dx = enemy.position.x - position.x;
      const dy = enemy.position.y - position.y;
      if (dx * dx + dy * dy > radiusSquared) continue;
      result[writeIndex] = enemy;
      writeIndex += 1;
    }
    result.length = writeIndex;
    return result;
  }

  nearestWithinRadius(position: Point, radius: number, excludeIds: readonly number[] = NO_EXCLUDED_ENEMIES): Enemy[] {
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
    excludeIds: readonly number[] = NO_EXCLUDED_ENEMIES,
  ): Enemy | null {
    if (radius < 0) return null;
    const radiusSquared = radius * radius;
    let nearest: Enemy | null = null;
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
        for (const enemy of cell) {
          if (enemy.dead || excludeIds.includes(enemy.id)) continue;
          const dx = enemy.position.x - position.x;
          const dy = enemy.position.y - position.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared <= radiusSquared && (!nearest || distanceSquared < nearestDistanceSquared)) {
            nearest = enemy;
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
        for (const enemy of cell) {
          if (enemy.dead) continue;
          const dx = enemy.position.x - position.x;
          const dy = enemy.position.y - position.y;
          if (dx * dx + dy * dy <= radiusSquared) count += 1;
        }
      }
    }
    return count;
  }

  alongSegment(start: Point, end: Point, padding: number): Enemy[] {
    return this.collectAlongSegment(start, end, padding, []);
  }

  collectAlongSegment(start: Point, end: Point, padding: number, result: Enemy[]): Enemy[] {
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
      const enemy = result[index];
      if (!enemy || enemy.dead) continue;
      result[writeIndex] = enemy;
      writeIndex += 1;
    }
    result.length = writeIndex;
    return result;
  }

  private collectBounds(minX: number, minY: number, maxX: number, maxY: number, result: Enemy[]): void {
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
        for (const enemy of cell) result.push(enemy);
      }
    }
  }

  private coordinate(value: number): number {
    return Math.floor(value / this.cellSize);
  }
}
