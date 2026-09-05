import type { Point } from '../game/types';
import { extendSpatialRift, RIFT_SPACE_COLOR, RIFT_SPACE_CONTACT, RIFT_SPACE_RETENTION } from './rift-space';
import type { ModuleDefinition } from './types';
const hitEffectId = 'module:rift-barrier:cross';
const stats = {
    damagePerSecond: 45,
    size: 9,
    duration: 5,
    radius: 72,
    sides: 4
} as const;
const diamondVertices = (center: Point): Point[] => [
    { x: center.x, y: center.y - stats.radius },
    { x: center.x + stats.radius, y: center.y },
    { x: center.x, y: center.y + stats.radius },
    { x: center.x - stats.radius, y: center.y },
];
export const riftBarrierModule: ModuleDefinition = {
    id: 'rift-barrier',
    kind: 'static',
    tags: ['static', 'area', 'rift-space'],
    meta: {
        color: RIFT_SPACE_COLOR, energy: 46, rarity: 'epic',
        text: { detail: {
                damage: stats.damagePerSecond,
                radius: stats.radius,
                duration: stats.duration + RIFT_SPACE_RETENTION,
                width: RIFT_SPACE_CONTACT.width
            } }
    },
    compile: (context) => context.emitProjectile({
        damage: stats.damagePerSecond,
        speed: 0,
        size: stats.size,
        lifetime: stats.duration,
        static: {
            duration: stats.duration,
            armTime: 0,
            triggerRadius: 0,
            cooldown: 0,
            maxTriggers: 0
        }
    }),
    onDeploy: ({ position, projectile, combat }) => {
        if (!projectile)
            return;
        const vertices = diamondVertices(position);
        const visual = { type: 'diamond' as const, center: { ...position }, radius: stats.radius };
        for (let index = 0; index < stats.sides; index += 1) {
            const start = vertices[index];
            const end = vertices[(index + 1) % stats.sides];
            if (!start || !end)
                continue;
            extendSpatialRift(combat, projectile, `rift-barrier:${index}`, end, {
                duration: RIFT_SPACE_RETENTION,
                damagePerSecond: projectile.damage,
                initialPosition: start,
                visual,
                hitEffectId
            });
        }
    }
};
