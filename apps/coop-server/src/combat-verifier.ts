import { Worker } from 'node:worker_threads';
import { combatResultsMatch } from '@prism-bastion/coop/results';
import type {
  CombatVerificationOutcome,
  CombatVerificationRequest,
  CombatWorkerRequest,
  CombatWorkerResponse,
  VerifyCombat,
} from '@prism-bastion/coop/simulation';
import type { CoopCombatResult } from '@prism-bastion/coop/types';

interface VerificationTask {
  id: number;
  request: CombatVerificationRequest;
  claimed: CoopCombatResult;
  complete: (outcome: CombatVerificationOutcome) => void;
}

interface WorkerSlot {
  worker: Worker;
  current: VerificationTask | null;
  error: Error | null;
}

const workerUrl = (): URL => new URL(
  import.meta.url.endsWith('.ts') ? './combat-worker.ts' : './combat-worker.mjs',
  import.meta.url,
);

export class CombatVerifierPool {
  private readonly slots: WorkerSlot[] = [];
  private readonly queue: VerificationTask[] = [];
  private nextTaskId = 1;
  private closed = false;

  constructor(workerCount: number, private readonly queueLimit: number) {
    if (!Number.isInteger(workerCount) || workerCount < 1) throw new RangeError('Combat worker count must be positive');
    if (!Number.isInteger(queueLimit) || queueLimit < 1) throw new RangeError('Combat queue limit must be positive');
    for (let index = 0; index < workerCount; index += 1) this.spawn(index);
  }

  readonly verify: VerifyCombat = (request, claimed, complete) => {
    if (this.closed) {
      complete({ ok: false, reason: 'verification-error', error: 'Combat verifier is closed' });
      return;
    }
    const idle = this.slots.some((slot) => slot.current === null);
    if (!idle && this.queue.length >= this.queueLimit) {
      complete({ ok: false, reason: 'queue-full', error: 'Combat verification queue is full' });
      return;
    }
    this.queue.push({
      id: this.nextTaskId,
      request: structuredClone(request),
      claimed: structuredClone(claimed),
      complete,
    });
    this.nextTaskId += 1;
    this.pump();
  };

  async close(): Promise<void> {
    this.closed = true;
    const queued = this.queue.splice(0);
    for (const task of queued) {
      task.complete({ ok: false, reason: 'verification-error', error: 'Combat verifier closed before verification' });
    }
    await Promise.all(this.slots.map((slot) => slot.worker.terminate()));
  }

  private spawn(index: number): void {
    const slot: WorkerSlot = { worker: new Worker(workerUrl()), current: null, error: null };
    this.slots[index] = slot;
    slot.worker.on('message', (message: CombatWorkerResponse) => this.completeWorkerTask(index, slot, message));
    slot.worker.on('error', (error) => {
      slot.error = error instanceof Error ? error : new Error(String(error));
    });
    slot.worker.on('exit', (code) => this.replaceWorker(index, slot, code));
  }

  private pump(): void {
    for (const slot of this.slots) {
      if (slot.current || this.queue.length === 0) continue;
      const task = this.queue.shift();
      if (!task) return;
      slot.current = task;
      const message: CombatWorkerRequest = { taskId: task.id, request: task.request };
      slot.worker.postMessage(message);
    }
  }

  private completeWorkerTask(index: number, slot: WorkerSlot, message: CombatWorkerResponse): void {
    if (this.slots[index] !== slot || slot.current?.id !== message.taskId) return;
    const task = slot.current;
    slot.current = null;
    if (!message.ok) {
      task.complete({ ok: false, reason: 'verification-error', error: message.error });
    } else if (!combatResultsMatch(message.result, task.claimed)) {
      task.complete({ ok: false, reason: 'result-mismatch', expected: message.result });
    } else task.complete({ ok: true });
    this.pump();
  }

  private replaceWorker(index: number, slot: WorkerSlot, code: number): void {
    if (this.slots[index] !== slot) return;
    const task = slot.current;
    if (task) {
      task.complete({
        ok: false,
        reason: 'verification-error',
        error: slot.error?.message ?? `Combat worker exited with code ${code}`,
      });
    }
    if (this.closed) return;
    this.spawn(index);
    this.pump();
  }
}
