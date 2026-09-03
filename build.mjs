import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const buildInfo = getBuildInfo();

await mkdir('dist', { recursive: true });
await Promise.all([
  esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    minify: true,
    sourcemap: true,
    outdir: 'dist',
    entryNames: 'app',
    assetNames: 'assets/[name]-[hash]',
    loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
    target: ['es2022'],
    legalComments: 'none',
    metafile: true,
    define: {
      __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
      __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
    },
    logLevel: 'warning',
  }),
  copyFile('index.html', 'dist/index.html'),
]);

console.log('Prism Bastion built in dist/');
