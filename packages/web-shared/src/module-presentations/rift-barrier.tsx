import { createModuleIcon } from './icons';
import { createRiftCrossEffect, RIFT_SPACE_COLOR, RIFT_SPACE_TINT } from './rift-space';
import type { ModulePresentation } from './types';
const RiftBarrierIcon = createModuleIcon(<>
  <path className="module-icon__line" d="M16 3L29 16 16 29 3 16z"/>
  <path className="module-icon__cut" d="M16 7l9 9-9 9-9-9z"/>
  <circle className="module-icon__fill" cx="16" cy="16" r="3"/>
</>);
const hitEffectId = 'module:rift-barrier:cross';
export const riftBarrierModule: ModulePresentation = {
    id: 'rift-barrier',
    icon: RiftBarrierIcon,
    hideProjectile: true,
    meta: {
        color: RIFT_SPACE_COLOR, displayColor: '#7c3fc2', tint: RIFT_SPACE_TINT
    },
    effects: [createRiftCrossEffect(hitEffectId)]
};
