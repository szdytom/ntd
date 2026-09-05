import { useTranslation } from 'react-i18next';
import type { CoopPlayerId, CoopRoomSnapshot } from '@prism-bastion/coop/types';
import type { ModuleId } from '@prism-bastion/game-core/game/types';
import { kindLabel, moduleDescription, moduleDetail, moduleName, rarityLabel } from '@prism-bastion/web-shared/i18n/presentation';
import { createModuleRegistry } from '@prism-bastion/game-core/modules';
import { modulePresentationRegistry } from '@prism-bastion/web-shared/module-presentations';
import { DraftProgress } from '@prism-bastion/web-shared/ui/DraftProgress';
import { EnergyBolt } from '@prism-bastion/web-shared/ui/EnergyBolt';
import { ModuleDraftCard } from '@prism-bastion/web-shared/ui/ModuleDraftCard';
import { moduleVariableStyle } from '@prism-bastion/web-shared/ui/modulePresentation';
import { SettingsPanel } from '@prism-bastion/web-shared/ui/SettingsPanel';
import styles from './CoopDraftScreen.module.css';

const coopModules = createModuleRegistry();

interface CoopDraftScreenProps {
  room: CoopRoomSnapshot;
  playerId: CoopPlayerId;
  onChoose: (choice: ModuleId | null) => void;
  onOpenThought: (id: string) => void;
}

export function CoopDraftScreen({ room, playerId, onChoose, onOpenThought }: CoopDraftScreenProps) {
  const { t } = useTranslation();
  const progressOffer = room.players.find((player) => player.draftOffer)?.draftOffer;
  const self = room.players.find((player) => player.id === playerId && !player.eliminated) ?? null;
  const peer = room.players.find((player) => player.id !== playerId && !player.eliminated) ?? null;

  return <main className={styles.stageShell}><section className={`${styles.stageConsole} ${styles.draftConsole}`}>
    <header className={styles.draftMasthead}>
      <div><p className={styles.eyebrow}>{t('coop.phase.draft')}</p><h1>{t('coop.draftTitle')}</h1></div>
      <div className={styles.draftHeadActions}>
        {progressOffer ? <DraftProgress className={styles.coopProgress} current={progressOffer.pick} total={progressOffer.totalPicks} /> : null}
        <button
          className={styles.abandonButton}
          data-selected={self?.draftLocked && self.draftChoice === null}
          disabled={!self?.draftOffer?.canAbandon || self.draftLocked}
          onClick={() => onChoose(null)}
        >{t('coop.abandon')}</button>
        <div className={styles.screenSettings}><SettingsPanel /></div>
      </div>
    </header>
    <div className={styles.draftWorkspace}>
      {peer ? <aside className={styles.peerOffer}>
        <div className={styles.peerIdentity}><p className={styles.offerRole}>{t('coop.friendOffer')}</p><h2>{peer.name}</h2></div>
        <div className={styles.peerChoices}>{peer.draftOffer?.choices.map((moduleId: ModuleId) => {
          const definition = coopModules.require(moduleId);
          const Icon = modulePresentationRegistry.require(definition.id).icon;
          const selected = peer.draftLocked && peer.draftChoice === moduleId;
          return <details data-selected={selected} data-dimmed={peer.draftLocked && !selected} style={moduleVariableStyle(definition)} key={moduleId}>
            <summary aria-label={moduleName(t, definition.id)}><Icon /><span>{moduleName(t, definition.id)}</span></summary>
            <div className={styles.peerPopover}>
              <strong>{moduleName(t, definition.id)}</strong>
              <small>{rarityLabel(t, definition.meta.rarity)} · {kindLabel(t, definition.kind)}</small>
              <p>{moduleDescription(t, definition)}</p>
              <span>{moduleDetail(t, definition)}</span>
            </div>
          </details>;
        })}</div>
        <div className={styles.peerStatus} data-locked={peer.draftLocked}>{peer.draftLocked ? t('coop.peerLocked') : t('coop.peerChoosing')}</div>
      </aside> : null}
      {self ? <section className={styles.localOffer}>
        <h2>{self.name} · {t('coop.you')}</h2>
        {self.draftLocked ? <p className={styles.lockedNotice}>{t('coop.waitingForPeer')}</p> : null}
        <div className={styles.choiceGrid}>{self.draftOffer?.choices.map((moduleId: ModuleId) => {
          const definition = coopModules.require(moduleId);
          const poolCount = room.pool[moduleId];
          const selected = self.draftLocked && self.draftChoice === moduleId;
          return <ModuleDraftCard
            key={moduleId}
            definition={definition}
            density="compact"
            selected={selected}
            dimmed={self.draftLocked && !selected}
            chooseDisabled={self.draftLocked}
            readouts={[
              { label: t('reward.energy'), value: <>{definition.meta.energy}<EnergyBolt /></> },
              { label: t('reward.inventory'), value: self.plan.inventory[moduleId] ?? 0 },
              { label: t('coop.poolLeft'), value: poolCount === 'unlimited' ? '∞' : poolCount },
            ]}
            onOpenThought={onOpenThought}
            onChoose={() => onChoose(moduleId)}
          />;
        })}</div>
      </section> : null}
    </div>
  </section></main>;
}
