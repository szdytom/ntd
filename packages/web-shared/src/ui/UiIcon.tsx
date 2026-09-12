import type { ReactNode } from 'react';
import styles from './UiIcon.module.css';
import { achievementIcons } from './icon-definitions/achievements';

interface IconDefinition {
	content: ReactNode;
	viewBox?: string;
	strokeWidth?: number;
}

const icons = {
	...achievementIcons,
	heart: {
		content: (
			<path fill="currentColor" stroke="none" d="M12 21 3.5 12.5C-2 7 5.5 0 12 6.5 18.5 0 26 7 20.5 12.5Z" />
		),
	},
	diamond: { content: <path d="M12 2 22 12 12 22 2 12Z" /> },
	diamondFilled: { content: <path fill="currentColor" stroke="none" d="M12 2 22 12 12 22 2 12Z" /> },
	play: { content: <path fill="currentColor" stroke="none" d="M6 3 21 12 6 21Z" /> },
	pause: { content: <path fill="currentColor" stroke="none" d="M5 3H10V21H5ZM14 3H19V21H14Z" /> },
	close: { content: <path d="M5 5 19 19M19 5 5 19" /> },
	external: { content: <path d="M5 19 19 5M5 5H19V19" /> },
	arrowLeft: { content: <path d="M20 12H4M11 5 4 12 11 19" /> },
	arrowRight: { content: <path d="M4 12H20M13 5 20 12 13 19" /> },
	arrowUp: { content: <path d="M12 20V4M5 11 12 4 19 11" /> },
	arrowDown: { content: <path d="M12 4V20M5 13 12 20 19 13" /> },
	chevronRight: { content: <path d="m8 4 8 8-8 8" /> },
	plus: { content: <path d="M12 4v16M4 12h16" /> },
	waves: { content: <path d="M3 6c3-4 6 4 9 0s6 4 9 0M3 12c3-4 6 4 9 0s6 4 9 0M3 18c3-4 6 4 9 0s6 4 9 0" /> },
	star: { content: <path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z" /> },
	settings: {
		content: (
			<>
				<path d="M12 2 20.66 7v10L12 22l-8.66-5V7Z" />
				<circle cx="12" cy="12" r="4" />
			</>
		),
	},
	sliders: {
		content: (
			<>
				<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11" />
				<path d="M8 3h4v6H8zM14 9h4v6h-4zM6 15h4v6H6z" />
			</>
		),
	},
	keyboard: { content: <path d="M2 5h20v14H2zM5 9h1m3 0h1m3 0h1m3 0h2M5 12h1m3 0h1m3 0h1m3 0h2M7 16h10" /> },
	info: {
		content: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 7v1M10 11h2v6m-2 0h4" />
			</>
		),
	},
	archive: { content: <path d="M3 3h18v5H3zM5 8v13h14V8M9 12h6" /> },
	fullscreen: { content: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /> },
	energy: { content: <path fill="currentColor" stroke="none" d="M14 1 3 13h8L8 23 22 9h-8Z" /> },
} satisfies Record<string, IconDefinition>;

export type UiIconName = keyof typeof icons;

/** Decorative UI icons inherit size and color; controls provide accessible labels. */
export function UiIcon({ name, className }: { name: UiIconName; className?: string }) {
	const definition: IconDefinition = icons[name];
	return (
		<svg
			viewBox={definition.viewBox ?? '0 0 24 24'}
			width="1em"
			height="1em"
			className={className ? `${styles.icon} ${className}` : styles.icon}
			fill="none"
			stroke="currentColor"
			strokeWidth={definition.strokeWidth ?? 2}
			strokeLinejoin="miter"
			aria-hidden="true"
			focusable="false"
		>
			{definition.content}
		</svg>
	);
}
