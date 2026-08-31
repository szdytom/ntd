import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMIES, LEVELS } from '../game/config';
import type { EnemyType, EnemyVariant } from '../game/types';
import {
  buildDefenseArchiveAnalytics,
  type DefenseRecord,
  type SectorStats,
  type SignalStats,
} from '../defense-archive';
import { difficultyName, enemyName, levelDescription, levelName } from '../i18n/presentation';
import { LevelMap } from './LevelMap';
import { SignalIcon } from './SignalIcon';
import './SectorArchive.css';

const percent = (value: number): string => `${Math.round(value * 100)}%`;

const signalLabel = (t: ReturnType<typeof useTranslation>['t'], variant: EnemyVariant): string => (
  variant === 'fracture-fragment' ? t('enemyArchive.fragments.name') : enemyName(t, variant as EnemyType)
);

const signalColor = (variant: EnemyVariant): string => ENEMIES[variant === 'fracture-fragment' ? 'fracture' : variant].color;
const signalIconType = (variant: EnemyVariant): EnemyType => variant === 'fracture-fragment' ? 'fracture' : variant;

const SignalLedger = ({ signals }: { signals: SignalStats[] }) => {
  const { t } = useTranslation();
  if (signals.length === 0) return <div className="sector-empty-ledger">
    <strong>{t('defenseArchive.sectors.noSignalData')}</strong>
    <span>{t('defenseArchive.sectors.noSignalDataDetail')}</span>
  </div>;
  return <div className="sector-signal-ledger">{signals.map((signal) => <article key={signal.variant} style={{ '--signal-accent': signalColor(signal.variant) } as CSSProperties}>
    <SignalIcon type={signalIconType(signal.variant)} className="sector-ledger-signal-icon" />
    <header><strong>{signalLabel(t, signal.variant)}</strong><b>{percent(signal.purificationRate)}</b></header>
    <div><span>{t('defenseArchive.short.defeated')} <b>{signal.defeated}</b></span><span>{t('defenseArchive.short.leaked')} <b>{signal.leaked}</b></span></div>
    <i aria-hidden="true"><b style={{ width: percent(signal.purificationRate) }} /></i>
  </article>)}</div>;
};

const WaveAnalysis = ({ sector }: { sector: SectorStats }) => {
  const { t } = useTranslation();
  const observed = sector.waves.filter((wave) => wave.attempts > 0);
  const weakest = observed.reduce<(typeof observed)[number] | null>((current, wave) => (
    !current || wave.clearRate < current.clearRate ? wave : current
  ), null);
  return <section className="sector-wave-analysis">
    <header>
      <div><h3>{t('defenseArchive.sectors.waveAnalysis')}</h3><p>{t('defenseArchive.sectors.waveAnalysisDetail')}</p></div>
      <span>{weakest
        ? weakest.clearRate === 1 ? t('defenseArchive.sectors.allWavesCleared')
          : t('defenseArchive.sectors.weakestWave', { wave: weakest.wave, rate: percent(weakest.clearRate) })
        : t('defenseArchive.sectors.noWaveData')}</span>
    </header>
    <div className="wave-pulse" role="list" aria-label={t('defenseArchive.sectors.wavePulseAria')}>
      {sector.waves.map((wave) => <article
        key={wave.wave}
        role="listitem"
        data-empty={wave.attempts === 0 || undefined}
        data-risk={(wave.attempts > 0 && wave.clearRate < .75) || undefined}
      >
        <header><span>{t('defenseArchive.sectors.waveNumber', { wave: String(wave.wave).padStart(2, '0') })}</span><strong>{wave.attempts > 0 ? percent(wave.clearRate) : '—'}</strong></header>
        <i aria-hidden="true"><b style={{ height: wave.attempts > 0 ? percent(wave.clearRate) : '0%' }} /></i>
        <small>{t('defenseArchive.sectors.attemptCount', { count: wave.attempts })}</small>
      </article>)}
    </div>
    <div className="sector-wave-table-scroll"><table className="sector-wave-table">
      <thead><tr>
        <th>{t('defenseArchive.column.wave')}</th>
        <th>{t('defenseArchive.sectors.reached')}</th>
        <th>{t('defenseArchive.sectors.cleared')}</th>
        <th>{t('defenseArchive.sectors.clearRate')}</th>
        <th>{t('defenseArchive.sectors.purificationRate')}</th>
        <th>{t('defenseArchive.column.defeated')}</th>
        <th>{t('defenseArchive.column.leaked')}</th>
        <th>{t('defenseArchive.sectors.coreDamage')}</th>
      </tr></thead>
      <tbody>{sector.waves.map((wave) => <tr key={wave.wave}>
        <th>{String(wave.wave).padStart(2, '0')}</th>
        <td>{wave.attempts}</td>
        <td>{wave.clears}</td>
        <td><b>{wave.attempts > 0 ? percent(wave.clearRate) : '—'}</b></td>
        <td>{wave.spawned > 0 ? percent(wave.purificationRate) : '—'}</td>
        <td>{wave.defeated}</td>
        <td>{wave.leaked}</td>
        <td>{wave.coreDamage}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
};

export function SectorArchive({ records }: { records: DefenseRecord[] }) {
  const { t } = useTranslation();
  const analytics = useMemo(() => buildDefenseArchiveAnalytics(records), [records]);
  const firstObserved = analytics.sectors.find((sector) => sector.defenses > 0)?.levelId;
  const [selectedId, setSelectedId] = useState(firstObserved ?? analytics.sectors[0]?.levelId ?? '');
  const selected = analytics.sectors.find((sector) => sector.levelId === selectedId) ?? analytics.sectors[0];
  if (!selected) return null;
  const config = LEVELS.find((level) => level.id === selected.levelId);
  const accent = config?.accent ?? '#6558e8';
  const sectorCode = config?.sector.replace('SECTOR ', '') ?? selected.levelId.toUpperCase();
  const metrics = [
    ['defenses', selected.defenses],
    ['winRate', percent(selected.winRate)],
    ['defeated', selected.defeated],
    ['leaked', selected.leaked],
  ] as const;
  return <div className="sector-archive" style={{ '--sector-accent': accent, '--level-accent': accent } as CSSProperties}>
    <nav className="sector-archive-index" aria-label={t('defenseArchive.sectors.indexAria')}>
      <header><strong>{t('defenseArchive.sectors.indexTitle')}</strong><span>{analytics.sectors.length}</span></header>
      <div>{analytics.sectors.map((sector) => {
        const level = LEVELS.find((item) => item.id === sector.levelId);
        const selectedSector = sector.levelId === selected.levelId;
        return <button
          key={sector.levelId}
          type="button"
          aria-current={selectedSector ? 'true' : undefined}
          className={selectedSector ? 'selected' : ''}
          style={{ '--sector-item-accent': level?.accent ?? '#6558e8' } as CSSProperties}
          onClick={() => setSelectedId(sector.levelId)}
        >
          <i aria-hidden="true" />
          <span><strong>{levelName(t, sector.levelId)}</strong><small>{level?.sector.replace('SECTOR ', '') ?? sector.levelId}</small></span>
          <b>{sector.wins}/{sector.defenses}</b>
        </button>;
      })}</div>
    </nav>

    <article className="sector-archive-record" aria-live="polite">
      <section className="sector-route-stage" aria-label={t('defenseArchive.sectors.routeAria')}>
        {config ? <LevelMap level={config} /> : <div className="sector-route-unknown" aria-hidden="true">◇</div>}
        <div className="sector-record-code"><span>{t('defenseArchive.sectors.recordLabel')}</span><strong>{sectorCode}</strong></div>
      </section>

      <section className="sector-summary">
        <header className="sector-record-head">
          <div><span>{t('defenseArchive.sectors.selectedSector')}</span><h2>{levelName(t, selected.levelId)}</h2><p>{config ? levelDescription(t, selected.levelId) : t('defenseArchive.sectors.unknownDescription')}</p></div>
          <div className="sector-difficulty-stamps">
            <span>{t('defenseArchive.sectors.clearedDifficulties')}</span>
            <div>{selected.clearedDifficulties.length > 0
              ? selected.clearedDifficulties.map((difficulty) => <b key={difficulty}>{difficultyName(t, difficulty)}</b>)
              : <small>{t('defenseArchive.sectors.noClears')}</small>}</div>
          </div>
        </header>
        <div className="sector-metrics" aria-label={t('defenseArchive.sectors.metricsAria')}>
          {metrics.map(([key, value]) => <div key={key}><span>{t(`defenseArchive.metric.${key}`)}</span><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="sector-ledger-section">
        <header><div><h3>{t('defenseArchive.signalStats')}</h3><p>{t('defenseArchive.sectors.signalStatsDetail')}</p></div><span>{selected.signals.length}</span></header>
        <SignalLedger signals={selected.signals} />
      </section>

      <WaveAnalysis sector={selected} />
    </article>
  </div>;
}
