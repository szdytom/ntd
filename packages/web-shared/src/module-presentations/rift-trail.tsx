import { createModuleIcon } from './icons';
import { createRiftCrossEffect, RIFT_SPACE_COLOR, RIFT_SPACE_TINT } from './rift-space';
import type { ModulePresentation } from './types';
const RiftTrailIcon = createModuleIcon(<>
  <path className="module-icon__fill" d="M5 4l6 5-3 4 6 3-4 5 6 7 4-7-2-5 6-4-3-4 6-4-9 2-5-4-3 4z"/>
  <path className="module-icon__cut" d="M13 5l2 6-3 4 5 3-2 7"/>
</>);
const hitEffectId = 'module:rift-trail:cross';
const effects = [createRiftCrossEffect(hitEffectId)] as const;
export const riftTrailModule: ModulePresentation = {
    id: 'rift-trail',
    icon: RiftTrailIcon,
    meta: {
        color: RIFT_SPACE_COLOR, displayColor: '#7c3fc2', tint: RIFT_SPACE_TINT
    },
    effects,
    renderProjectile: ({ ctx, projectile }) => {
        ctx.save();
        ctx.globalAlpha = 0.46;
        ctx.strokeStyle = RIFT_SPACE_COLOR;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, projectile.radius + 5, -projectile.age * 2.3, -projectile.age * 2.3 + Math.PI);
        ctx.stroke();
        ctx.restore();
    }
};
