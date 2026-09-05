import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LEVELS } from '@prism-bastion/game-core/game/config';
import type { SignalId } from '@prism-bastion/game-core/game/types';
import { signalName, levelName } from '@prism-bastion/web-shared/i18n/presentation';
import { DEFAULT_SIGNAL_ID, getSignalCapability, SIGNAL_IDS, signalRegistry } from '@prism-bastion/game-core/signals';
import { ArchiveHeader } from '@prism-bastion/web-shared/ui/ArchiveHeader';
import { SignalSpecimen } from '@prism-bastion/web-shared/ui/SignalSpecimen';
import { Tag } from '@prism-bastion/web-shared/ui/Tag';
import './SignalArchive.css';

const MAXIMUMS = {
  hp: Math.max(...SIGNAL_IDS.map((type) => signalRegistry.require(type).stats.health)),
  speed: Math.max(...SIGNAL_IDS.map((type) => signalRegistry.require(type).stats.speed)),
  reward: Math.max(...SIGNAL_IDS.map((type) => signalRegistry.require(type).stats.reward)),
  coreDamage: Math.max(...SIGNAL_IDS.map((type) => signalRegistry.require(type).stats.coreDamage)),
};

export function SignalArchive({ onBack, initialType = DEFAULT_SIGNAL_ID, backToBattlefield = false }: {
  onBack: () => void;
  initialType?: SignalId;
  backToBattlefield?: boolean;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<SignalId>(initialType);
  const [demoModeId, setDemoModeId] = useState<string | null>(null);
  const definition = signalRegistry.require(selectedType);
  const demoMode = definition.archive.demo?.modes.find((mode) => mode.id === demoModeId);
  const split = getSignalCapability(definition, 'split-on-death');
  const aura = getSignalCapability(definition, 'tower-suppression-aura');
  const showingFragments = demoMode?.profile === 'split-child' && Boolean(split);
  const showingSuppressedTower = demoMode?.profile === 'suppressed-tower' && Boolean(aura);
  const baseProfile = {
    hp: definition.stats.health,
    speed: definition.stats.speed,
    reward: definition.stats.reward,
    coreDamage: definition.stats.coreDamage,
    radius: definition.stats.radius,
  };
  const profile = showingFragments && split ? {
    hp: Math.max(1, Math.round(baseProfile.hp * split.healthScale)),
    speed: baseProfile.speed * split.speedScale,
    reward: Math.max(1, Math.round(baseProfile.reward * split.rewardScale)),
    coreDamage: Math.max(1, Math.round(baseProfile.coreDamage * split.coreDamageScale)),
    radius: baseProfile.radius * split.radiusScale,
  } : baseProfile;
  const selectedIndex = SIGNAL_IDS.indexOf(selectedType);
  const encounteredLevels = useMemo(() => LEVELS.filter((level) => (
    level.waves.some((wave) => wave.some((entry) => entry.type === selectedType))
  )), [selectedType]);

  const ability = showingFragments ? {
    label: t('signalArchive.abilities.fragment'),
    detail: t('signalArchive.abilities.fragmentDetail'),
  } : {
    label: t(definition.archive.ability.labelKey),
    detail: definition.archive.ability.values
      ? t(definition.archive.ability.detailKey, definition.archive.ability.values)
      : t(definition.archive.ability.detailKey),
  };

  const archiveStyle = { '--signal-accent': definition.visual.color } as CSSProperties;
  const name = showingSuppressedTower
    ? t(demoMode!.text.nameKey)
    : showingFragments ? t(demoMode!.text.nameKey) : signalName(t, selectedType);
  const role = showingSuppressedTower
    ? t(demoMode!.text.roleKey)
    : showingFragments
    ? t(demoMode!.text.roleKey, { count: split?.count ?? 0 })
    : t(definition.text.roleKey);
  const description = showingSuppressedTower
    ? t(demoMode!.text.descriptionKey)
    : showingFragments
    ? t(demoMode!.text.descriptionKey)
    : t(definition.text.descriptionKey);
  const formatValue = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  const stats = [
    { key: 'health', label: t('signalArchive.stats.health'), display: formatValue(profile.hp), value: profile.hp, maximum: MAXIMUMS.hp },
    { key: 'speed', label: t('signalArchive.stats.speed'), display: t('signalArchive.units.speed', { value: formatValue(profile.speed) }), value: profile.speed, maximum: MAXIMUMS.speed },
    { key: 'reward', label: t('signalArchive.stats.reward'), display: t('signalArchive.units.reward', { value: formatValue(profile.reward) }), value: profile.reward, maximum: MAXIMUMS.reward },
    { key: 'coreDamage', label: t('signalArchive.stats.coreDamage'), display: formatValue(profile.coreDamage), value: profile.coreDamage, maximum: MAXIMUMS.coreDamage },
  ];

  return <main className="archive-shell signal-archive-shell" style={archiveStyle}>
    <ArchiveHeader
      className="signal-archive-head"
      title={t('signalArchive.title')}
      backLabel={t(backToBattlefield ? 'signalArchive.backToBattlefield' : 'signalArchive.back')}
      onBack={onBack}
      decoration={<div className="signal-archive-seal" aria-hidden="true">
        <i />
        <b>{String(selectedIndex + 1).padStart(2, '0')}</b>
      </div>}
    />

    <section className="signal-archive-console">
      <nav className="signal-archive-index" aria-label={t('signalArchive.indexAria')}>
        <div className="signal-archive-index-head">
          <span>{t('signalArchive.indexTitle')}</span>
        </div>
        <div className="signal-archive-index-list">
          {SIGNAL_IDS.map((type) => {
            const signal = signalRegistry.require(type);
            const selected = type === selectedType;
            return <button
              key={type}
              className={selected ? 'selected' : ''}
              style={{ '--signal-item-color': signal.visual.color } as CSSProperties}
              onClick={() => {
                setSelectedType(type);
                setDemoModeId(null);
              }}
              aria-current={selected ? 'true' : undefined}
            >
              <i aria-hidden="true" />
              <strong>{signalName(t, type)}</strong>
              <small>{t(signal.text.roleKey)}</small>
            </button>;
          })}
        </div>
      </nav>

      <article className="signal-archive-record" aria-live="polite">
        <div className="signal-archive-subject">
          <div className="signal-archive-orbit orbit-outer" aria-hidden="true" />
          <div className="signal-archive-orbit orbit-inner" aria-hidden="true" />
          <SignalSpecimen
            type={selectedType}
            label={name}
            demoMode={demoMode}
          />
          {definition.archive.demo?.modes[0] ? <button
            className="specimen-toggle"
            type="button"
            aria-pressed={Boolean(demoMode)}
            onClick={() => setDemoModeId((value) => value ? null : definition.archive.demo!.modes[0]!.id)}
          >
            <i aria-hidden="true" />
            {t(demoMode ? definition.archive.demo.modes[0].restoreKey : definition.archive.demo.modes[0].actionKey)}
          </button> : null}
          <Tag className="subject-code" tone="yellow">{t('signalArchive.signalNumber', { number: String(selectedIndex + 1).padStart(2, '0') })}</Tag>
          <Tag className="subject-scale" tone="accent" contrast={definition.visual.labelContrast ?? 'light'}>{showingSuppressedTower
            ? `${Math.round((aura?.energyRegenMultiplier ?? 1) * 100)}%`
            : t('signalArchive.radius', { value: formatValue(profile.radius) })}</Tag>
        </div>

        <div className="signal-archive-data">
          <header>
            <div><span>{t('signalArchive.recordLabel')}</span><h2>{name}</h2></div>
            <Tag className="archive-role-tag" tone="yellow">{role}</Tag>
          </header>
          <p className="signal-archive-description">{description}</p>

          {showingSuppressedTower && aura ? <section
            className="signal-archive-stats suppressed-tower-stats"
            aria-label={t('signalArchive.suppressedTower.impactAria')}
          >
            <div className="signal-archive-stat" data-stat="suppressedCooldown">
              <div>
                <span>{t('signalArchive.suppressedTower.cooldown')}</span>
                <strong>{formatValue(aura.cooldownMultiplier)}×</strong>
              </div>
              <i><b style={{ width: '100%' }} /></i>
            </div>
            <div className="signal-archive-stat" data-stat="suppressedRegen">
              <div>
                <span>{t('signalArchive.suppressedTower.energyRegen')}</span>
                <strong>{Math.round(aura.energyRegenMultiplier * 100)}%</strong>
              </div>
              <i><b style={{ width: `${aura.energyRegenMultiplier * 100}%` }} /></i>
            </div>
          </section> : <>
            <section className="signal-archive-stats" aria-label={t('signalArchive.statsAria')}>
              {stats.map((stat) => <div className="signal-archive-stat" key={stat.key} data-stat={stat.key}>
                <div><span>{stat.label}</span><strong>{stat.display}</strong></div>
                <i><b style={{ width: `${Math.max(5, stat.value / stat.maximum * 100)}%` }} /></i>
              </div>)}
            </section>

            <div className="signal-archive-analysis">
              <section className="ability-record">
                <span>{t('signalArchive.abilityLabel')}</span>
                <strong>{ability.label}</strong>
                <p>{ability.detail}</p>
              </section>
              <section className="counter-record">
                <span>{t('signalArchive.counterLabel')}</span>
                <p>{t(definition.text.counterKey)}</p>
              </section>
            </div>

            <footer className="signal-archive-observed">
              <span>{t('signalArchive.observedIn')}</span>
              <div>{encounteredLevels.map((level) => <Tag key={level.id}>{levelName(t, level.id)}</Tag>)}</div>
            </footer>
          </>}
        </div>
      </article>
    </section>
  </main>;
}
