import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const buildInfo = getBuildInfo();

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');

const context = await esbuild.context({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  sourcemap: true,
  outdir: 'dist',
  entryNames: 'app',
  assetNames: 'assets/[name]-[hash]',
  loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
  },
});

await context.watch();
const { host, port } = await context.serve({ servedir: 'dist', port: 4173 });
console.log(`Prism Bastion running at http://${host ?? 'localhost'}:${port}`);
