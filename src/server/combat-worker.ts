import { parentPort } from 'node:worker_threads';
import { simulateAuthoritativeCombat } from './combat-simulation';
import type { CombatWorkerRequest, CombatWorkerResponse } from './combat-simulation';

const port = parentPort;
if (!port) throw new Error('The co-op combat worker must run inside a worker thread');

port.on('message', (message: CombatWorkerRequest) => {
  let response: CombatWorkerResponse;
  try {
    response = { taskId: message.taskId, ok: true, result: simulateAuthoritativeCombat(message.request) };
  } catch (error) {
    response = {
      taskId: message.taskId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  port.postMessage(response);
});
