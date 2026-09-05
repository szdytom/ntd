import * as esbuild from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const supportedArguments = new Set(['--client-only', '--server-only']);
const unknownArgument = process.argv.slice(2).find((argument) => !supportedArguments.has(argument));
if (unknownArgument) throw new Error(`Unknown co-op build argument: ${unknownArgument}`);
const clientOnly = process.argv.includes('--client-only');
const serverOnly = process.argv.includes('--server-only');
if (clientOnly && serverOnly) throw new Error('Choose either --client-only or --server-only');
const buildClient = !serverOnly;
const buildServer = !clientOnly;

const buildInfo = getBuildInfo();
const publicServers = (() => {
  if (!buildClient) return {};
  const raw = process.env.COOP_PUBLIC_SERVERS;
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('COOP_PUBLIC_SERVERS must be a JSON object mapping server IDs to wss:// URLs');
  }
  for (const [id, value] of Object.entries(parsed)) {
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(id) || typeof value !== 'string') {
      throw new TypeError(`Invalid co-op public server entry: ${id}`);
    }
    const url = new URL(value);
    if (url.protocol !== 'wss:') throw new TypeError(`Co-op public server ${id} must use wss://`);
  }
  return parsed;
})();
const browserShared = {
  bundle: true,
  sourcemap: true,
  target: ['es2022'],
  legalComments: 'none',
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
    __PRISM_BASTION_COOP_SERVERS__: JSON.stringify(publicServers),
    __PRISM_BASTION_COOP_ALLOW_SERVER_OVERRIDE__: 'false',
  },
};
const serverShared = {
  bundle: true,
  sourcemap: true,
  minify: true,
  target: ['node22'],
  jsx: 'automatic',
  legalComments: 'eof',
  platform: 'node',
  format: 'esm',
  banner: {
    js: 'import { createRequire as __prismCreateRequire } from "node:module"; const require = __prismCreateRequire(import.meta.url);',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'warning',
};

await rm('dist-coop', { recursive: true, force: true });
await mkdir('dist-coop', { recursive: true });
const buildTasks = [];
if (buildClient) {
  buildTasks.push(esbuild.build({
    ...browserShared,
    entryPoints: { coop: 'src/coop-main.tsx', app: 'src/main.tsx' },
    minify: true,
    outdir: 'dist-coop',
    entryNames: '[name]',
    assetNames: 'assets/[name]-[hash]',
    loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
    platform: 'browser',
    logLevel: 'warning',
  }));
  buildTasks.push(copyFile('coop.html', 'dist-coop/index.html'));
  buildTasks.push(copyFile('index.html', 'dist-coop/single-player.html'));
}
if (buildServer) {
  buildTasks.push(esbuild.build({
    ...serverShared,
    entryPoints: ['src/server/index.ts'],
    outfile: 'dist-coop/server.mjs',
  }));
  buildTasks.push(esbuild.build({
    ...serverShared,
    entryPoints: ['src/server/combat-worker.ts'],
    outfile: 'dist-coop/combat-worker.mjs',
  }));
}
await Promise.all(buildTasks);

const target = clientOnly ? 'client' : serverOnly ? 'server' : 'client and server';
console.log(`Prism Bastion co-op ${target} built in dist-coop/`);
