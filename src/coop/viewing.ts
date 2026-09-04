import type { CoopPlayerId, CoopRoomSnapshot } from './types';

export function peerDefenseToFollow(
  previous: CoopRoomSnapshot | null,
  current: CoopRoomSnapshot,
  localPlayerId: CoopPlayerId | null,
): CoopPlayerId | null {
  if (!localPlayerId || current.phase !== 'local-defense') return null;
  const previousSelf = previous?.players.find((player) => player.id === localPlayerId);
  const currentSelf = current.players.find((player) => player.id === localPlayerId);
  const currentPeer = current.players.find((player) => player.id !== localPlayerId);
  return !previousSelf?.combatSubmitted && currentSelf?.combatSubmitted && currentPeer && !currentPeer.combatSubmitted
    ? currentPeer.id
    : null;
}
