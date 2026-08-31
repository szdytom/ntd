import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LEVELS } from '../game/config';
import { DIFFICULTIES } from '../game/difficulty';
import type { DifficultyId, EnemyVariant, ModuleId } from '../game/types';
import {
  buildDefenseArchiveAnalytics,
  type DefenseRecord,
  type DefenseArchiveRepository,
  type DefenseArchiveSnapshot,
} from '../defense-archive';
import { difficultyName, levelName, moduleName } from '../i18n/presentation';
import { createModuleRegistry } from '../modules';
import { SettingsPanel } from './SettingsPanel';
import { SectorArchive } from './SectorArchive';
import { SignalLedger, signalIconType, signalLabel } from './SignalLedger';
import { SignalIcon } from './SignalIcon';
import { moduleVariableStyle } from './modulePresentation';
import './DefenseArchive.css';

type DefenseArchiveTab = 'overview' | 'sectors' | 'achievements' | 'history';
type ResultFilter = 'all' | 'won' | 'lost';
const PAGE_SIZE = 20;
const ARCHIVE_MODULES = createModuleRegistry();
const ARCHIVE_TABS: DefenseArchiveTab[] = ['overview', 'sectors', 'achievements', 'history'];

const formatDuration = (seconds: number): string => {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const ArchiveModule = ({ moduleId, count }: { moduleId: ModuleId; count?: number }) => {
  const { t } = useTranslation();
  const definition = ARCHIVE_MODULES.get(moduleId);
  const Icon = definition?.icon;
  return <span className="archive-module" style={definition ? moduleVariableStyle(definition) : undefined}>
    <i aria-hidden="true">{Icon ? <Icon /> : '?'}</i>
    <em>{moduleName(t, moduleId)}</em>
    {count === undefined ? null : <b>×{count}</b>}
  </span>;
};

const DefenseArchiveHeader = ({ repository, onBack, onDefenseArchiveCleared }: {
  repository: DefenseArchiveRepository;
  onBack: () => void;
  onDefenseArchiveCleared: () => void;
}) => {
  const { t } = useTranslation();
  return <header className="defense-archive-head">
    <button className="defense-archive-back" onClick={onBack} aria-label={t('defenseArchive.back')}><span aria-hidden="true">←</span></button>
    <div className="defense-archive-title"><h1>{t('defenseArchive.title')}</h1></div>
    <SettingsPanel defenseArchiveRepository={repository} onDefenseArchiveCleared={onDefenseArchiveCleared} />
  </header>;
};

const Overview = ({ records }: { records: DefenseRecord[] }) => {
  const { t } = useTranslation();
  const analytics = useMemo(() => buildDefenseArchiveAnalytics(records), [records]);
  const stats = analytics.aggregate;
  const metrics = [
    ['defenses', stats.defenses], ['winRate', `${Math.round(stats.winRate * 100)}%`],
    ['defeated', stats.defeated], ['leaked', stats.leaked],
    ['duration', formatDuration(stats.durationSeconds)], ['bestScore', stats.bestScore],
  ];
  return <div className="defense-archive-overview">
    <section className="defense-archive-metrics" aria-label={t('defenseArchive.overview.metricsAria')}>
      {metrics.map(([key, value], index) => <div key={key} className={`defense-archive-metric metric-${index + 1}`}>
        <span>{t(`defenseArchive.metric.${key}`)}</span><strong>{value}</strong>
      </div>)}
    </section>
    <section className="defense-archive-table-section signal-ledger">
      <header><h2>{t('defenseArchive.signalStats')}</h2><p>{t('defenseArchive.signalStatsDetail')}</p></header>
      <SignalLedger signals={analytics.signals} includeUnobserved />
    </section>
  </div>;
};

const Achievements = ({ snapshot }: { snapshot: DefenseArchiveSnapshot }) => {
  const { t } = useTranslation();
  const categories = ['tutorial', 'progress', 'challenge'] as const;
  return <div className="achievement-groups">{categories.map((category) => {
    const achievements = snapshot.achievements.filter((achievement) => achievement.category === category);
    return <section key={category} className="achievement-group" data-category={category}>
      <header><h2>{t(`defenseArchive.category.${category}`)}</h2><span>{achievements.filter((item) => item.unlockedAt).length} / {achievements.length}</span></header>
      <div className="achievement-grid">{achievements.map((achievement) => {
        const unlocked = achievement.unlockedAt !== null;
        return <article key={achievement.id} className={unlocked ? 'unlocked' : ''}>
          <div className="achievement-mark" aria-hidden="true">{unlocked ? '◆' : '◇'}</div>
          <div><h3>{t(`defenseArchive.achievements.${achievement.id}.name`)}</h3><p>{t(`defenseArchive.achievements.${achievement.id}.description`)}</p>
            <div className="achievement-progress"><i style={{ width: `${Math.min(100, achievement.current / achievement.target * 100)}%` }} /></div>
            <small>{unlocked && achievement.unlockedAt
              ? t('defenseArchive.unlockedOn', { date: new Date(achievement.unlockedAt).toLocaleDateString() })
              : t('defenseArchive.progressValue', { current: achievement.current, target: achievement.target })}</small>
          </div>
        </article>;
      })}</div>
    </section>;
  })}</div>;
};

const DefenseDetail = ({ record, onClose }: { record: DefenseRecord; onClose: () => void }) => {
  const { t } = useTranslation();
  const wallSeconds = (record.endedAt - record.startedAt) / 1000;
  return <article className="defense-detail" data-result={record.result}>
    <header><div><span>{new Date(record.endedAt).toLocaleString()}</span><h2>{levelName(t, record.levelId)}</h2></div><button onClick={onClose} aria-label={t('defenseArchive.closeDetail')}>×</button></header>
    <div className="defense-result-line"><strong>{t(`defenseArchive.result.${record.result}`)}</strong><span>{difficultyName(t, record.difficultyId)} · {record.waveReached}/{record.maxWaves}</span></div>
    <dl className="defense-facts">
      <div><dt>{t('defenseArchive.detail.core')}</dt><dd>{record.core}/{record.maxCore}</dd></div>
      <div><dt>{t('defenseArchive.detail.score')}</dt><dd>{record.score}</dd></div>
      <div><dt>{t('defenseArchive.detail.duration')}</dt><dd>{formatDuration(wallSeconds)}</dd></div>
      <div><dt>{t('defenseArchive.detail.simulation')}</dt><dd>{formatDuration(record.simulationSeconds)}</dd></div>
      <div><dt>{t('defenseArchive.detail.version')}</dt><dd>{record.build.commit} · {record.build.commitDate}</dd></div>
    </dl>
    <section><h3>{t('defenseArchive.detail.waves')}</h3><div className="defense-archive-table-scroll"><table className="wave-table"><thead><tr><th>{t('defenseArchive.column.wave')}</th><th>{t('defenseArchive.column.signal')}</th><th>{t('defenseArchive.column.spawned')}</th><th>{t('defenseArchive.column.defeated')}</th><th>{t('defenseArchive.column.leaked')}</th><th>{t('defenseArchive.column.remaining')}</th></tr></thead>
      <tbody>{record.waves.flatMap((wave) => Object.entries(wave.enemies).map(([variant, tally]) => <tr key={`${wave.wave}-${variant}`}><td>{wave.wave}</td><th><span className="defense-wave-signal"><SignalIcon type={signalIconType(variant as EnemyVariant)} />{signalLabel(t, variant as EnemyVariant)}</span></th><td>{tally?.spawned ?? 0}{(tally?.queued ?? 0) > 0 ? <small> +{tally?.queued} {t('defenseArchive.short.queued')}</small> : null}</td><td>{tally?.defeated ?? 0}</td><td>{tally?.leaked ?? 0}</td><td>{tally?.remaining ?? 0}</td></tr>))}</tbody>
    </table></div></section>
    <section><h3>{t('defenseArchive.detail.inventory')}</h3><div className="inventory-ledger">{record.inventory.map((entry) => <ArchiveModule key={entry.moduleId} moduleId={entry.moduleId} count={entry.count} />)}</div></section>
    <section><h3>{t('defenseArchive.detail.towers')}</h3><div className="tower-records">{record.towers.map((tower, index) => <article key={tower.padIndex}>
      <header><strong>{t('defenseArchive.detail.tower', { number: index + 1 })}</strong><span>Lv.{tower.level} · {t(`tower.target.${tower.targeting}`)}</span></header>
      <ol>{tower.slots.map((moduleId, slot) => <li key={slot}><small>{String(slot + 1).padStart(2, '0')}</small>{moduleId ? <ArchiveModule moduleId={moduleId} /> : <span className="archive-module-empty">{t('defenseArchive.detail.emptySlot')}</span>}</li>)}</ol>
    </article>)}</div></section>
  </article>;
};

const History = ({ records }: { records: DefenseRecord[] }) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<ResultFilter>('all');
  const [levelId, setLevelId] = useState('all');
  const [difficultyId, setDifficultyId] = useState<'all' | DifficultyId>('all');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = records.filter((record) => (result === 'all' || record.result === result)
    && (levelId === 'all' || record.levelId === levelId)
    && (difficultyId === 'all' || record.difficultyId === difficultyId));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selected = records.find((record) => record.id === selectedId) ?? null;
  const setFilter = (setter: (value: never) => void, value: string): void => { setter(value as never); setPage(0); setSelectedId(null); };
  return <div className={`history-layout ${selected ? 'has-detail' : ''}`}>
    <section className="history-list">
      <div className="history-filters" aria-label={t('defenseArchive.filters')}>
        <label><span>{t('defenseArchive.filter.result')}</span><select value={result} onChange={(event) => setFilter(setResult, event.currentTarget.value)}><option value="all">{t('defenseArchive.filter.all')}</option><option value="won">{t('defenseArchive.result.won')}</option><option value="lost">{t('defenseArchive.result.lost')}</option></select></label>
        <label><span>{t('defenseArchive.filter.level')}</span><select value={levelId} onChange={(event) => setFilter(setLevelId, event.currentTarget.value)}><option value="all">{t('defenseArchive.filter.all')}</option>{LEVELS.map((level) => <option key={level.id} value={level.id}>{levelName(t, level.id)}</option>)}</select></label>
        <label><span>{t('defenseArchive.filter.difficulty')}</span><select value={difficultyId} onChange={(event) => setFilter(setDifficultyId, event.currentTarget.value)}><option value="all">{t('defenseArchive.filter.all')}</option>{DIFFICULTIES.map((difficulty) => <option key={difficulty.id} value={difficulty.id}>{difficultyName(t, difficulty.id)}</option>)}</select></label>
      </div>
      {visible.length === 0 ? <div className="defense-archive-empty compact"><strong>{t('defenseArchive.noMatches')}</strong><p>{t('defenseArchive.noMatchesDetail')}</p></div> : <div className="defense-list">{visible.map((record) => <button key={record.id} data-result={record.result} aria-pressed={selectedId === record.id} onClick={() => setSelectedId(record.id)}>
        <i aria-hidden="true"/><span><strong>{levelName(t, record.levelId)}</strong><small>{new Date(record.endedAt).toLocaleString()}</small></span><span><b>{t(`defenseArchive.result.${record.result}`)}</b><small>{difficultyName(t, record.difficultyId)} · {record.waveReached}/{record.maxWaves}</small></span><em>→</em>
      </button>)}</div>}
      <footer className="history-pages"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>←</button><span>{page + 1} / {pageCount}</span><button disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>→</button></footer>
    </section>
    {selected ? <DefenseDetail record={selected} onClose={() => setSelectedId(null)} /> : <aside className="history-prompt"><div>◇</div><strong>{t('defenseArchive.selectDefense')}</strong><p>{t('defenseArchive.selectDefenseDetail')}</p></aside>}
  </div>;
};

export function DefenseArchive({ repository, onBack }: { repository: DefenseArchiveRepository; onBack: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DefenseArchiveTab>('overview');
  const [snapshot, setSnapshot] = useState<DefenseArchiveSnapshot | null>(null);
  const [error, setError] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const load = (): void => {
    setError(false);
    void repository.readSnapshot().then(setSnapshot).catch(() => setError(true));
  };
  useEffect(load, [repository]);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [tab]);
  const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? ARCHIVE_TABS.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % ARCHIVE_TABS.length
          : event.key === 'ArrowLeft' ? (index - 1 + ARCHIVE_TABS.length) % ARCHIVE_TABS.length
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = ARCHIVE_TABS[nextIndex];
    if (!nextTab) return;
    setTab(nextTab);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };
  return <main className="defense-archive-shell">
    <div className="defense-archive-frame">
      <DefenseArchiveHeader repository={repository} onBack={onBack} onDefenseArchiveCleared={load} />
      <nav className="defense-archive-tabs" role="tablist" aria-label={t('defenseArchive.sections')}>{ARCHIVE_TABS.map((item, index) => <button
        key={item}
        id={`defense-archive-tab-${item}`}
        data-tab={item}
        role="tab"
        aria-controls="defense-archive-panel"
        aria-selected={tab === item}
        tabIndex={tab === item ? 0 : -1}
        onKeyDown={(event) => moveTabFocus(event, index)}
        onClick={() => setTab(item)}
      ><span>{t(`defenseArchive.tab.${item}`)}</span>{item === 'history' && snapshot ? <b>{snapshot.defenses.length}</b> : null}</button>)}</nav>
      <section
        ref={contentRef}
        id="defense-archive-panel"
        className="defense-archive-content"
        data-tab={tab}
        role="tabpanel"
        aria-labelledby={`defense-archive-tab-${tab}`}
        tabIndex={0}
      >
        {error ? <div className="defense-archive-empty"><strong>{t('defenseArchive.storageError')}</strong><p>{t('defenseArchive.storageErrorDetail')}</p><button onClick={load}>{t('defenseArchive.retry')}</button></div>
          : !snapshot ? <div className="defense-archive-loading"><i/><span>{t('defenseArchive.loading')}</span></div>
            : snapshot.warningCount > 0 ? <div className="defense-archive-warning">{t('defenseArchive.corruptWarning', { count: snapshot.warningCount })}</div> : null}
        {!error && snapshot
          ? tab === 'overview' ? <Overview records={snapshot.defenses} />
            : tab === 'sectors' ? <SectorArchive records={snapshot.defenses} />
              : tab === 'achievements' ? <Achievements snapshot={snapshot} />
                : <History records={snapshot.defenses} />
          : null}
      </section>
      <footer className="defense-archive-footer"><span>{t('defenseArchive.localOnly')}</span></footer>
    </div>
  </main>;
}
