import { spawn } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import WebSocket from 'ws';

const allowedOrigin = 'https://game.example.test';
const combatWorker = new Worker(new URL('../dist-coop/combat-worker.mjs', import.meta.url));
const workerResponse = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Co-op combat worker did not respond')), 5_000);
  combatWorker.once('message', (message) => {
    clearTimeout(timeout);
    resolve(message);
  });
  combatWorker.once('error', reject);
});
combatWorker.postMessage({
  taskId: 1,
  request: {
    levelId: 'starter-elbow',
    difficultyId: 'normal',
    phaseId: 1,
    kind: 'local-defense',
    wave: 1,
    planHash: '00000000',
    plan: {
      core: 20,
      maxCore: 20,
      shards: 180,
      towers: [{
        id: 1,
        padIndex: 0,
        maxEnergy: 100,
        energyRegen: 10,
        cooldown: 1,
        range: 200,
        targeting: 'core-nearest',
        level: 1,
        slots: [null, null, null, null],
      }],
      inventory: {},
      nextTowerId: 2,
    },
    signals: [],
  },
});
const workerResult = await workerResponse;
await combatWorker.terminate();
if (!workerResult.ok || workerResult.result.leaks.length !== 5) {
  throw new Error('Co-op authoritative combat worker smoke check failed');
}

const server = spawn(process.execPath, ['dist-coop/server.mjs'], {
  env: {
    ...process.env,
    COOP_ALLOWED_ORIGINS: allowedOrigin,
    COOP_DEV_LOG: '0',
    COOP_HOST: '127.0.0.1',
    COOP_SERVER_PORT: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');
server.stdout.on('data', (chunk) => { output += chunk; });
server.stderr.on('data', (chunk) => { output += chunk; });

const listeningPort = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Co-op server did not start\n${output}`)), 5_000);
  const inspect = (chunk) => {
    const match = String(chunk).match(/listening on ws:\/\/127\.0\.0\.1:(\d+)/);
    if (!match) return;
    clearTimeout(timeout);
    resolve(Number(match[1]));
  };
  server.stdout.on('data', inspect);
  server.once('exit', (code) => {
    clearTimeout(timeout);
    reject(new Error(`Co-op server exited before listening (${code})\n${output}`));
  });
});

const connect = (url, origin) => new Promise((resolve, reject) => {
  const socket = new WebSocket(url, { origin });
  socket.once('open', () => {
    socket.close();
    resolve(101);
  });
  socket.once('unexpected-response', (_request, response) => {
    response.resume();
    resolve(response.statusCode ?? 0);
  });
  socket.once('error', reject);
});

try {
  const healthResponse = await fetch(`http://127.0.0.1:${listeningPort}/healthz`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || health.ok !== true) throw new Error('Co-op health check failed');

  const webSocketUrl = `ws://127.0.0.1:${listeningPort}`;
  const rejectedStatus = await connect(webSocketUrl, 'https://attacker.example');
  if (rejectedStatus === 101) throw new Error('Co-op server accepted an unauthorized Origin');
  const allowedStatus = await connect(webSocketUrl, allowedOrigin);
  if (allowedStatus !== 101) throw new Error(`Co-op server rejected its configured Origin (${allowedStatus})`);

  process.stdout.write('Co-op production server, combat worker, health, and Origin policy verified.\n');
} finally {
  server.kill('SIGTERM');
}
