import { useTranslation } from 'react-i18next';
import { AchievementIcon } from './AchievementIcon';
import type { DefenseArchiveSnapshot } from './types';
import styles from '../DefenseArchive.module.css';

const categories = ['tutorial', 'progress', 'challenge'] as const;

export function DefenseArchiveAchievements({ snapshot }: { snapshot: DefenseArchiveSnapshot }) {
	const { t } = useTranslation();
	return (
		<div className={styles['achievement-groups']}>
			{categories.map((category) => {
				const achievements = snapshot.achievements.filter((achievement) => achievement.category === category);
				return (
					<section key={category} className={styles['achievement-group']} data-category={category}>
						<header>
							<h2>{t(`defenseArchive.category.${category}`)}</h2>
							<span>
								{achievements.filter((item) => item.unlockedAt).length} / {achievements.length}
							</span>
						</header>
						<div className={styles['achievement-grid']}>
							{achievements.map((achievement) => {
								const unlocked = achievement.unlockedAt !== null;
								const progress = `${Math.min(100, (achievement.current / achievement.target) * 100)}%`;
								const status =
									unlocked && achievement.unlockedAt
										? t('defenseArchive.unlockedOn', {
												date: new Date(achievement.unlockedAt).toLocaleDateString(),
											})
										: t('defenseArchive.progressValue', {
												current: achievement.current,
												target: achievement.target,
											});
								return (
									<article key={achievement.id} className={unlocked ? styles.unlocked : undefined}>
										<div className={styles['achievement-mark']} aria-hidden="true">
											<AchievementIcon achievementId={achievement.id} />
										</div>
										<div>
											<h3>{t(`defenseArchive.achievements.${achievement.id}.name`)}</h3>
											<p>{t(`defenseArchive.achievements.${achievement.id}.description`)}</p>
											<div className={styles['achievement-progress']}>
												<i style={{ width: progress }} />
											</div>
											<small>{status}</small>
										</div>
									</article>
								);
							})}
						</div>
					</section>
				);
			})}
		</div>
	);
}
