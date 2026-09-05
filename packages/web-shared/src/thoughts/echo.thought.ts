import { buildRepeatThought } from '../thoughts/authoring';
import { echoModule } from '@prism-bastion/game-core/modules/echo';

export const echoThought = buildRepeatThought({
  module: echoModule,
  seed: 173,
  casts: 2,
  copy: {
    title: 'thoughts.echo.title',
    summary: 'thoughts.echo.summary',
    sectionRepeat: 'thoughts.echo.sections.repeat',
    sectionStack: 'thoughts.echo.sections.stack',
    sectionFocus: 'thoughts.echo.sections.focus',
    beatRepeat: 'thoughts.echo.beats.repeat',
    beatVolley: 'thoughts.echo.beats.volley',
    beatEnergy: 'thoughts.echo.beats.energy',
    beatStack: 'thoughts.echo.beats.stack',
    beatMultiplied: 'thoughts.echo.beats.multiplied',
    beatFocus: 'thoughts.echo.beats.focus',
    beatFocusedHit: 'thoughts.echo.beats.focusedHit',
  },
});
