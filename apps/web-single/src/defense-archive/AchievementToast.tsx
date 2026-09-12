import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AchievementToast.module.css';
import { AchievementIcon } from './AchievementIcon';

export const ACHIEVEMENT_TOAST_DURATION = 5_000;

// Horizontal drift, upward impulse, stagger, and lifetime keep the debris irregular.
const particles = [
	[-78, -70, 0, 2400],
	[-52, -108, 70, 2800],
	[-24, -86, 130, 2500],
	[30, -116, 30, 2900],
	[62, -78, 100, 2600],
	[92, -52, 170, 2200],
	[-96, -42, 120, 2300],
	[74, -96, 210, 2800],
	[-38, -58, 240, 2400],
	[12, -72, 190, 2600],
	[46, -48, 280, 2300],
	[-64, -92, 310, 2700],
] as const;

export function AchievementToast({ achievementId }: { achievementId: string | undefined }) {
	const { t } = useTranslation();
	return (
		<div className={styles.region} role="status" aria-live="polite" aria-atomic="true">
			{achievementId && (
				<div
					key={achievementId}
					className={styles.toast}
					data-achievement-toast
					style={{ '--toast-duration': `${ACHIEVEMENT_TOAST_DURATION}ms` } as CSSProperties}
				>
					<div className={styles.badge} aria-hidden="true">
						<AchievementIcon achievementId={achievementId} />
						<div className={styles.particles}>
							{particles.map(([x, y, delay, duration], index) => (
								<i
									key={index}
									style={
										{
											'--x': `${x}px`,
											'--y': `${y}px`,
											'--delay': `${delay}ms`,
											'--duration': `${duration}ms`,
										} as CSSProperties
									}
								>
									<b />
								</i>
							))}
						</div>
					</div>
					<div className={styles.copy}>
						<svg
							className={styles.composition}
							viewBox="0 0 280 80"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							<path
								d="M7 7H273V73H7ZM7 17H47V7M205 7V17H250V49H273M250 31H273M229 49H250V73M7 63H35V73M160 73V63H229V49"
								fill="none"
								stroke="#15121e"
								vectorEffect="non-scaling-stroke"
							/>
							<path
								d="M7 7H273V73H7ZM7 17H47V7M205 7V17H250V49H273M250 31H273M229 49H250V73M7 63H35V73M160 73V63H229V49"
								transform="translate(0 1)"
								fill="none"
								stroke="#51495f"
								vectorEffect="non-scaling-stroke"
							/>
						</svg>
						<span>{t('defenseArchive.achievementToastTitle')}</span>
						<strong>{t(`defenseArchive.achievements.${achievementId}.name`)}</strong>
					</div>
				</div>
			)}
		</div>
	);
}
