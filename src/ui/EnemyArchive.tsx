import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES, LEVELS } from '../game/config';
import type { EnemyType } from '../game/types';
import { enemyName, levelName } from '../i18n/presentation';
import { EnemySpecimen } from './EnemySpecimen';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Tag } from './Tag';
import './EnemyArchive.css';

const ENEMY_TYPES: readonly EnemyType[] = ['spark', 'surge', 'kite', 'block', 'hex', 'crown', 'fracture', 'radiant'];
const MAXIMUMS = {
  hp: Math.max(...ENEMY_TYPES.map((type) => ENEMIES[type].hp)),
  speed: Math.max(...ENEMY_TYPES.map((type) => ENEMIES[type].speed)),
  reward: Math.max(...ENEMY_TYPES.map((type) => ENEMIES[type].reward)),
  coreDamage: Math.max(...ENEMY_TYPES.map((type) => ENEMIES[type].coreDamage)),
};

export function EnemyArchive({ onBack, initialType = 'spark', backToBattlefield = false }: {
  onBack: () => void;
  initialType?: EnemyType;
  backToBattlefield?: boolean;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<EnemyType>(initialType);
  const [fractureSplit, setFractureSplit] = useState(false);
  const [radiantSuppression, setRadiantSuppression] = useState(false);
  const config = ENEMIES[selectedType];
  const showingFragments = selectedType === 'fracture' && fractureSplit && Boolean(config.split);
  const showingSuppressedTower = selectedType === 'radiant' && radiantSuppression && Boolean(config.aura);
  const split = config.split;
  const profile = showingFragments && split ? {
    hp: Math.max(1, Math.round(config.hp * split.healthScale)),
    speed: config.speed * split.speedScale,
    reward: Math.max(1, Math.round(config.reward * split.rewardScale)),
    coreDamage: Math.max(1, Math.round(config.coreDamage * split.coreDamageScale)),
    radius: config.radius * split.radiusScale,
  } : config;
  const selectedIndex = ENEMY_TYPES.indexOf(selectedType);
  const encounteredLevels = useMemo(() => LEVELS.filter((level) => (
    level.waves.some((wave) => wave.includes(selectedType))
  )), [selectedType]);

  const ability = showingFragments ? {
    label: t('enemyArchive.abilities.fragment'),
    detail: t('enemyArchive.abilities.fragmentDetail'),
  } : config.shield ? {
    label: t('enemyArchive.abilities.shield'),
    detail: t('enemyArchive.abilities.shieldDetail', {
      capacity: config.shield.capacity,
      regen: config.shield.regen,
      cooldown: config.shield.cooldown,
    }),
  } : config.split ? {
    label: t('enemyArchive.abilities.split'),
    detail: t('enemyArchive.abilities.splitDetail', {
      count: config.split.count,
      health: Math.round(config.split.healthScale * 100),
      speed: Math.round(config.split.speedScale * 100),
    }),
  } : config.aura ? {
    label: t('enemyArchive.abilities.suppression'),
    detail: t('enemyArchive.abilities.suppressionDetail', {
      radius: config.aura.radius,
      cooldown: config.aura.cooldownMultiplier,
      regen: Math.round(config.aura.energyRegenMultiplier * 100),
    }),
  } : config.movement ? {
    label: t('enemyArchive.abilities.waveAdvance'),
    detail: t('enemyArchive.abilities.waveAdvanceDetail', {
      cycle: config.movement.cycle,
      multiplier: config.movement.peakSpeedMultiplier,
      power: config.movement.wavePower,
      speed: config.speed,
    }),
  } : {
    label: t('enemyArchive.abilities.standard'),
    detail: t('enemyArchive.abilities.standardDetail'),
  };

  const archiveStyle = { '--enemy-accent': config.color } as CSSProperties;
  const name = showingSuppressedTower
    ? t('enemyArchive.suppressedTower.name')
    : showingFragments ? t('enemyArchive.fragments.name') : enemyName(t, selectedType);
  const role = showingSuppressedTower
    ? t('enemyArchive.suppressedTower.role')
    : showingFragments
    ? t('enemyArchive.fragments.role', { count: split?.count ?? 3 })
    : t(`enemyArchive.enemies.${selectedType}.role`);
  const description = showingSuppressedTower
    ? t('enemyArchive.suppressedTower.description')
    : showingFragments
    ? t('enemyArchive.fragments.description')
    : t(`enemyArchive.enemies.${selectedType}.description`);
  const formatValue = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  const stats = [
    { key: 'health', label: t('enemyArchive.stats.health'), display: formatValue(profile.hp), value: profile.hp, maximum: MAXIMUMS.hp },
    { key: 'speed', label: t('enemyArchive.stats.speed'), display: t('enemyArchive.units.speed', { value: formatValue(profile.speed) }), value: profile.speed, maximum: MAXIMUMS.speed },
    { key: 'reward', label: t('enemyArchive.stats.reward'), display: t('enemyArchive.units.reward', { value: formatValue(profile.reward) }), value: profile.reward, maximum: MAXIMUMS.reward },
    { key: 'coreDamage', label: t('enemyArchive.stats.coreDamage'), display: formatValue(profile.coreDamage), value: profile.coreDamage, maximum: MAXIMUMS.coreDamage },
  ];

  return <main className="enemy-archive-shell" style={archiveStyle}>
    <header className="enemy-archive-head">
      <button className="enemy-archive-back" onClick={onBack} aria-label={t(backToBattlefield ? 'enemyArchive.backToBattlefield' : 'enemyArchive.back')}>
        <span aria-hidden="true">←</span>
      </button>
      <div>
        <h1>{t('enemyArchive.title')}</h1>
      </div>
      <LanguageSwitcher />
      <div className="enemy-archive-seal" aria-hidden="true"><i /><b>{String(selectedIndex + 1).padStart(2, '0')}</b><span /></div>
    </header>

    <section className="enemy-archive-console">
      <nav className="enemy-archive-index" aria-label={t('enemyArchive.indexAria')}>
        <div className="enemy-archive-index-head">
          <span>{t('enemyArchive.indexTitle')}</span>
        </div>
        <div className="enemy-archive-index-list">
          {ENEMY_TYPES.map((type) => {
            const enemy = ENEMIES[type];
            const selected = type === selectedType;
            return <button
              key={type}
              className={selected ? 'selected' : ''}
              style={{ '--enemy-item-color': enemy.color } as CSSProperties}
              onClick={() => {
                setSelectedType(type);
                setFractureSplit(false);
                setRadiantSuppression(false);
              }}
              aria-current={selected ? 'true' : undefined}
            >
              <i aria-hidden="true" />
              <strong>{enemyName(t, type)}</strong>
              <small>{t(`enemyArchive.enemies.${type}.role`)}</small>
            </button>;
          })}
        </div>
      </nav>

      <article className="enemy-archive-record" aria-live="polite">
        <div className="enemy-archive-subject">
          <div className="enemy-archive-orbit orbit-outer" aria-hidden="true" />
          <div className="enemy-archive-orbit orbit-inner" aria-hidden="true" />
          <EnemySpecimen
            type={selectedType}
            label={name}
            fractureSplit={fractureSplit}
            radiantSuppression={radiantSuppression}
          />
          {selectedType === 'fracture' ? <button
            className="specimen-toggle fracture-toggle"
            type="button"
            aria-pressed={fractureSplit}
            onClick={() => setFractureSplit((value) => !value)}
          >
            <i aria-hidden="true" />
            {t(fractureSplit ? 'enemyArchive.fragments.restore' : 'enemyArchive.fragments.show')}
          </button> : null}
          {selectedType === 'radiant' ? <button
            className="specimen-toggle suppression-toggle"
            type="button"
            aria-pressed={radiantSuppression}
            onClick={() => setRadiantSuppression((value) => !value)}
          >
            <i aria-hidden="true" />
            {t(radiantSuppression ? 'enemyArchive.suppressedTower.restore' : 'enemyArchive.suppressedTower.show')}
          </button> : null}
          <Tag className="subject-code" tone="yellow">{t('enemyArchive.signalNumber', { number: String(selectedIndex + 1).padStart(2, '0') })}</Tag>
          <Tag className="subject-scale" tone="accent" contrast={selectedType === 'spark' ? 'dark' : 'light'}>{showingSuppressedTower
            ? `${Math.round((config.aura?.energyRegenMultiplier ?? 1) * 100)}%`
            : t('enemyArchive.radius', { value: formatValue(profile.radius) })}</Tag>
        </div>

        <div className="enemy-archive-data">
          <header>
            <div><span>{t('enemyArchive.recordLabel')}</span><h2>{name}</h2></div>
            <Tag className="archive-role-tag" tone="yellow">{role}</Tag>
          </header>
          <p className="enemy-archive-description">{description}</p>

          {showingSuppressedTower && config.aura ? <section
            className="enemy-archive-stats suppressed-tower-stats"
            aria-label={t('enemyArchive.suppressedTower.impactAria')}
          >
            <div className="enemy-archive-stat" data-stat="suppressedCooldown">
              <div>
                <span>{t('enemyArchive.suppressedTower.cooldown')}</span>
                <strong>{formatValue(config.aura.cooldownMultiplier)}×</strong>
              </div>
              <i><b style={{ width: '100%' }} /></i>
            </div>
            <div className="enemy-archive-stat" data-stat="suppressedRegen">
              <div>
                <span>{t('enemyArchive.suppressedTower.energyRegen')}</span>
                <strong>{Math.round(config.aura.energyRegenMultiplier * 100)}%</strong>
              </div>
              <i><b style={{ width: `${config.aura.energyRegenMultiplier * 100}%` }} /></i>
            </div>
          </section> : <>
            <section className="enemy-archive-stats" aria-label={t('enemyArchive.statsAria')}>
              {stats.map((stat) => <div className="enemy-archive-stat" key={stat.key} data-stat={stat.key}>
                <div><span>{stat.label}</span><strong>{stat.display}</strong></div>
                <i><b style={{ width: `${Math.max(5, stat.value / stat.maximum * 100)}%` }} /></i>
              </div>)}
            </section>

            <div className="enemy-archive-analysis">
              <section className="ability-record">
                <span>{t('enemyArchive.abilityLabel')}</span>
                <strong>{ability.label}</strong>
                <p>{ability.detail}</p>
              </section>
              <section className="counter-record">
                <span>{t('enemyArchive.counterLabel')}</span>
                <p>{t(`enemyArchive.enemies.${selectedType}.counter`)}</p>
              </section>
            </div>

            <footer className="enemy-archive-observed">
              <span>{t('enemyArchive.observedIn')}</span>
              <div>{encounteredLevels.map((level) => <Tag key={level.id}>{levelName(t, level.id)}</Tag>)}</div>
            </footer>
          </>}
        </div>
      </article>
    </section>
  </main>;
}
