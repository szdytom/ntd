import type WebSocket from 'ws';
import { CoopGameController } from '@prism-bastion/coop/controller';
import { createInitialCoopPlan, hashCoopPlan } from '@prism-bastion/coop/planning';
import type { CoopPlayerPlan, CoopTowerPlan } from '@prism-bastion/coop/types';
import { LEVELS } from '@prism-bastion/game-core/game/config';
import type { ModuleId } from '@prism-bastion/game-core/game/types';
import { CoopRoom } from '../apps/coop-server/src/coop-room';

const runCount = Number.parseInt(process.env.COOP_BENCH_RUNS ?? '12', 10);
const warmupCount = Math.min(3, runCount);
const level = LEVELS.find((candidate) => candidate.id === 'triune-delta');
if (!level) throw new Error('Missing triune-delta benchmark level');

type PlanFactory = () => CoopPlayerPlan;

const cloneTower = (
  base: CoopTowerPlan,
  id: number,
  padIndex: number,
  slots: readonly ModuleId[],
  stress = false,
): CoopTowerPlan => ({
  ...structuredClone(base),
  id,
  padIndex,
  level: stress ? 5 : 3,
  maxEnergy: stress ? 220 : 150,
  energyRegen: stress ? 24 : 14,
  cooldown: stress ? 0.55 : 0.78,
  range: stress ? 320 : 250,
  slots: [...slots],
});

const initialPlan = (): CoopPlayerPlan => createInitialCoopPlan(level.id, 'extreme', 42);
const noFirePlan = (): CoopPlayerPlan => {
  const plan = initialPlan();
  plan.towers[0]?.slots.fill(null);
  return plan;
};
const realisticPlan = (): CoopPlayerPlan => {
  const plan = initialPlan();
  const base = plan.towers[0];
  if (!base) throw new Error('Benchmark plan requires a starting tower');
  const loadouts: readonly (readonly ModuleId[])[] = [
    ['double-fork', 'fork', 'seeker', 'needle'],
    ['impact-trigger', 'pulse', 'proximity-mine', 'nova'],
    ['ricochet', 'colossus', 'razor'],
    ['barrage', 'double-fork', 'fork', 'needle'],
  ];
  plan.towers = loadouts.map((slots, index) => cloneTower(base, index + 1, index, slots));
  plan.nextTowerId = plan.towers.length + 1;
  return plan;
};
const stressPlan = (): CoopPlayerPlan => {
  const plan = initialPlan();
  const base = plan.towers[0];
  if (!base) throw new Error('Benchmark plan requires a starting tower');
  plan.towers = level.towerPads.map((_, index) => cloneTower(
    base,
    index + 1,
    index,
    ['barrage', 'double-fork', 'fork', 'seeker', 'needle'],
    true,
  ));
  plan.nextTowerId = plan.towers.length + 1;
  return plan;
};

interface CombatMeasurement {
  setupMs: number;
  simulationMs: number;
  leaks: number;
}

const runCombat = (createPlan: PlanFactory): CombatMeasurement => {
  const plan = createPlan();
  const setupStarted = performance.now();
  const controller = new CoopGameController({ levelId: level.id, difficultyId: 'extreme', seed: 0 });
  controller.applyPlan(plan);
  const setupMs = performance.now() - setupStarted;
  let leaks = -1;
  controller.engine.subscribe((event) => {
    if (event.type === 'combat-phase-completed') leaks = event.result.leaks.length;
  });
  controller.startCombat({
    phaseId: 1,
    planHash: hashCoopPlan(plan),
    wave: level.waves.length,
    kind: 'local-defense',
  });
  const simulationStarted = performance.now();
  const completed = controller.fastForward();
  const simulationMs = performance.now() - simulationStarted;
  if (!completed || leaks < 0) throw new Error('Benchmark combat did not complete');
  return { setupMs, simulationMs, leaks };
};

const percentile = (values: readonly number[], fraction: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
};

const scenarios: ReadonlyArray<{ name: string; createPlan: PlanFactory }> = [
  { name: 'no-fire late wave', createPlan: noFirePlan },
  { name: '4-tower mixed build', createPlan: realisticPlan },
  { name: '10-tower fan-out stress', createPlan: stressPlan },
];

console.log(`Co-op authoritative simulation benchmark (${process.version}, ${level.id} wave ${level.waves.length}, extreme)`);
console.log(`Runs: ${runCount} measured + ${warmupCount} warm-up per scenario`);
for (const scenario of scenarios) {
  for (let index = 0; index < warmupCount; index += 1) runCombat(scenario.createPlan);
  const measurements = Array.from({ length: runCount }, () => runCombat(scenario.createPlan));
  const setup = measurements.map((measurement) => measurement.setupMs);
  const simulation = measurements.map((measurement) => measurement.simulationMs);
  const median = percentile(simulation, 0.5);
  const p95 = percentile(simulation, 0.95);
  const validationsPerCoreSecond = 1_000 / Math.max(p95, 0.01);
  const roomsAtSixtySecondCadence = validationsPerCoreSecond * 60 * 0.7 / 2;
  console.log([
    `\n${scenario.name}`,
    `  setup median:      ${percentile(setup, 0.5).toFixed(2)} ms`,
    `  simulation median: ${median.toFixed(2)} ms`,
    `  simulation p95:    ${p95.toFixed(2)} ms`,
    `  result leaks:      ${measurements[0]?.leaks ?? 0}`,
    `  p95 throughput:    ${validationsPerCoreSecond.toFixed(1)} player phases/core/s`,
    `  60s cadence:       ${Math.floor(roomsAtSixtySecondCadence)} rooms/core at 70% CPU`,
  ].join('\n'));
}

class FakeSocket {
  readyState = 1;
  send(): void {}
  close(): void { this.readyState = 3; }
}

const collectGarbage = (): void => {
  if (!globalThis.gc) throw new Error('Run the capacity report with --expose-gc');
  for (let index = 0; index < 3; index += 1) globalThis.gc();
};

const retainedBytesPerItem = <T>(count: number, create: (index: number) => T): {
  bytes: number;
  retained: T[];
} => {
  collectGarbage();
  const before = process.memoryUsage().heapUsed;
  const retained = Array.from({ length: count }, (_, index) => create(index));
  collectGarbage();
  const after = process.memoryUsage().heapUsed;
  return { bytes: Math.max(0, after - before) / count, retained };
};

const roomMemory = retainedBytesPerItem(2_000, (index) => {
  const first = new FakeSocket();
  const room = new CoopRoom({
    code: index.toString(32).toUpperCase().padStart(6, 'A').slice(-6),
    hostName: 'Alpha',
    hostSocket: first as unknown as WebSocket,
    levelId: level.id,
    difficultyId: 'extreme',
    seed: index,
    onClosed: () => {},
    verifyCombat: () => { throw new Error('Idle room benchmark must not start combat'); },
  });
  room.join('Beta', new FakeSocket() as unknown as WebSocket);
  return room;
});
const engineMemory = retainedBytesPerItem(200, () => {
  const controller = new CoopGameController({ levelId: level.id, difficultyId: 'extreme', seed: 0 });
  controller.applyPlan(realisticPlan());
  return controller;
});

console.log([
  '\nRetained heap estimates (forced GC)',
  `  room state + two fake sockets: ${(roomMemory.bytes / 1024).toFixed(1)} KiB/room (${roomMemory.retained.length} sampled)`,
  `  idle 4-tower co-op controller: ${(engineMemory.bytes / 1024).toFixed(1)} KiB/controller (${engineMemory.retained.length} sampled)`,
  '  Excludes native WebSocket buffers, V8 headroom, process baseline, proxy, and container overhead.',
].join('\n'));
