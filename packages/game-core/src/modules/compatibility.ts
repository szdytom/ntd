import type { ModuleDefinition, ModuleTag } from './types';

interface TagSelector {
  tag: ModuleTag;
}

export interface IneffectiveCombinationRule {
  subject: TagSelector;
  object: TagSelector;
}

/**
 * Compatibility is described in terms of module-owned tags. Adding a new
 * route modifier automatically opts it into these rules by declaring `route`.
 */
export const INEFFECTIVE_COMBINATION_RULES: readonly IneffectiveCombinationRule[] = [
  { subject: { tag: 'route' }, object: { tag: 'fixed-route' } },
];

const matches = (definition: ModuleDefinition, selector: TagSelector): boolean => (
  definition.tags.includes(selector.tag)
);

export const isIneffectiveCombination = (
  subject: ModuleDefinition,
  object: ModuleDefinition,
): boolean => INEFFECTIVE_COMBINATION_RULES.some((rule) => (
  matches(subject, rule.subject) && matches(object, rule.object)
));
