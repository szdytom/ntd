import { UiIcon, type UiIconName } from '@prism-bastion/web-shared/ui/UiIcon';

const achievementIcons: Readonly<Record<string, UiIconName>> = {
	'tutorial.complete': 'achievementTraining',
	'tutorial.creative-signal': 'achievementInjection',
	'tutorial.second-tower': 'achievementArray',
	'tutorial.reorder': 'achievementReorder',
	'tutorial.wrap': 'achievementWrap',
	'tutorial.targeting': 'achievementTargeting',
	'tutorial.max-tower': 'achievementCalibration',
	'tutorial.trail': 'achievementTrail',
	'progress.signal-spectrum': 'achievementSpectrum',
	'progress.purifier-1000': 'achievementPurifier',
	'challenge.single-tower': 'achievementSolo',
	'challenge.level-one': 'achievementLevelOne',
	'challenge.legendary-grid': 'achievementLegend',
	'challenge.five-kinds': 'achievementLanguage',
	'progress.clear.relaxed': 'achievementClearRelaxed',
	'progress.clear.easy': 'achievementClearEasy',
	'progress.clear.normal': 'achievementClearNormal',
	'progress.clear.hard': 'achievementClearHard',
	'progress.clear.extreme': 'achievementClearExtreme',
	'progress.flawless.relaxed': 'achievementFlawlessRelaxed',
	'progress.flawless.easy': 'achievementFlawlessEasy',
	'progress.flawless.normal': 'achievementFlawlessNormal',
	'progress.flawless.hard': 'achievementFlawlessHard',
	'progress.flawless.extreme': 'achievementFlawlessExtreme',
};

/** The archive and unlock toast retain the same symbol in every achievement state. */
export function AchievementIcon({ achievementId }: { achievementId: string }) {
	return <UiIcon name={achievementIcons[achievementId] ?? 'diamond'} />;
}
