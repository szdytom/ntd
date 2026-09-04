import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const buildInfo = getBuildInfo();
const publicServers = (() => {
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
const shared = {
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

await mkdir('dist-coop', { recursive: true });
await Promise.all([
  esbuild.build({
    ...shared,
    entryPoints: { coop: 'src/coop-main.tsx', app: 'src/main.tsx' },
    minify: true,
    outdir: 'dist-coop',
    entryNames: '[name]',
    assetNames: 'assets/[name]-[hash]',
    loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
    platform: 'browser',
    logLevel: 'warning',
  }),
  esbuild.build({
    ...shared,
    entryPoints: ['src/server/index.ts'],
    minify: false,
    outfile: 'dist-coop/server.mjs',
    platform: 'node',
    format: 'esm',
    packages: 'external',
    logLevel: 'warning',
  }),
  esbuild.build({
    ...shared,
    entryPoints: ['src/server/combat-worker.ts'],
    minify: false,
    outfile: 'dist-coop/combat-worker.mjs',
    platform: 'node',
    format: 'esm',
    packages: 'external',
    logLevel: 'warning',
  }),
  copyFile('coop.html', 'dist-coop/index.html'),
  copyFile('index.html', 'dist-coop/single-player.html'),
]);

console.log('Prism Bastion co-op built in dist-coop/');
