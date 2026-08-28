import type { Enemy, Point } from './types';

export class EnemySpatialIndex {
  private readonly cells = new Map<string, Enemy[]>();

  constructor(private readonly cellSize = 128) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('cellSize must be positive');
  }

  rebuild(enemies: readonly Enemy[]): void {
    this.cells.clear();
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const key = this.key(this.coordinate(enemy.position.x), this.coordinate(enemy.position.y));
      const cell = this.cells.get(key);
      if (cell) cell.push(enemy);
      else this.cells.set(key, [enemy]);
    }
  }

  withinRadius(position: Point, radius: number, excludeIds: readonly number[] = []): Enemy[] {
    if (radius < 0) return [];
    const radiusSquared = radius * radius;
    const excluded = excludeIds.length > 0 ? new Set(excludeIds) : null;
    return this.queryBounds(position.x - radius, position.y - radius, position.x + radius, position.y + radius)
      .filter((enemy) => {
        const dx = enemy.position.x - position.x;
        const dy = enemy.position.y - position.y;
        return !enemy.dead && !excluded?.has(enemy.id) && dx * dx + dy * dy <= radiusSquared;
      });
  }

  nearestWithinRadius(position: Point, radius: number, excludeIds: readonly number[] = []): Enemy[] {
    return this.withinRadius(position, radius, excludeIds).sort((left, right) => {
      const leftX = left.position.x - position.x;
      const leftY = left.position.y - position.y;
      const rightX = right.position.x - position.x;
      const rightY = right.position.y - position.y;
      return leftX * leftX + leftY * leftY - rightX * rightX - rightY * rightY;
    });
  }

  alongSegment(start: Point, end: Point, padding: number): Enemy[] {
    return this.queryBounds(
      Math.min(start.x, end.x) - padding,
      Math.min(start.y, end.y) - padding,
      Math.max(start.x, end.x) + padding,
      Math.max(start.y, end.y) + padding,
    ).filter((enemy) => !enemy.dead);
  }

  private queryBounds(minX: number, minY: number, maxX: number, maxY: number): Enemy[] {
    const result: Enemy[] = [];
    for (let cellX = this.coordinate(minX); cellX <= this.coordinate(maxX); cellX += 1) {
      for (let cellY = this.coordinate(minY); cellY <= this.coordinate(maxY); cellY += 1) {
        const cell = this.cells.get(this.key(cellX, cellY));
        if (cell) result.push(...cell);
      }
    }
    return result;
  }

  private coordinate(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  private key(x: number, y: number): string {
    return `${x}:${y}`;
  }
}
