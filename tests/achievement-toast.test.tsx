// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import i18n from '@prism-bastion/web-shared/i18n';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import { GameSession } from '@prism-bastion/web-single/GameSession';
import { ACHIEVEMENT_TOAST_DURATION } from '../apps/web-single/src/defense-archive/AchievementToast';
import type { DefenseArchiveRepository } from '../apps/web-single/src/defense-archive';

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

it('queues every unlock and preserves the current display time when more arrive', async () => {
	vi.useFakeTimers();
	const engine = new GameEngine({ mode: 'creative', seed: 9 });
	const recordFact = vi
		.fn()
		.mockResolvedValueOnce(['tutorial.creative-signal', 'tutorial.second-tower'])
		.mockResolvedValueOnce(['tutorial.targeting']);
	render(
		<GameSession
			engine={engine}
			defenseArchive={{ recordFact } as unknown as DefenseArchiveRepository}
			onExit={() => undefined}
			onOpenArchive={() => undefined}
			onTutorialResolved={() => undefined}
		/>,
	);
	const name = (id: string) => i18n.t(`defenseArchive.achievements.${id}.name`);
	await act(async () => {
		engine.spawnCreativeSignal('spark');
	});
	expect(screen.getByText(name('tutorial.creative-signal'))).toBeTruthy();
	await act(async () => {
		vi.advanceTimersByTime(2_000);
		engine.placeTower(1);
	});
	expect(screen.queryByText(name('tutorial.targeting'))).toBeNull();
	await act(async () => {
		vi.advanceTimersByTime(ACHIEVEMENT_TOAST_DURATION - 2_000);
	});
	expect(screen.getByText(name('tutorial.second-tower'))).toBeTruthy();
	await act(async () => {
		vi.advanceTimersByTime(ACHIEVEMENT_TOAST_DURATION);
	});
	expect(screen.getByText(name('tutorial.targeting'))).toBeTruthy();
	await act(async () => {
		vi.advanceTimersByTime(ACHIEVEMENT_TOAST_DURATION);
	});
	expect(document.querySelector('[data-achievement-toast]')).toBeNull();
});
