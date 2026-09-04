import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const buildInfo = getBuildInfo();
const shared = {
  bundle: true,
  sourcemap: true,
  target: ['es2022'],
  legalComments: 'none',
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
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
    packages: 'external',
    logLevel: 'warning',
  }),
  copyFile('coop.html', 'dist-coop/index.html'),
  copyFile('index.html', 'dist-coop/single-player.html'),
]);

console.log('Prism Bastion co-op built in dist-coop/');
