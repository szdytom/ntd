import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const buildInfo = getBuildInfo();

const outputDirectory = 'apps/web-single/dist';
await mkdir(outputDirectory, { recursive: true });
await copyFile('index.html', `${outputDirectory}/index.html`);

const context = await esbuild.context({
  entryPoints: ['apps/web-single/src/main.tsx'],
  bundle: true,
  sourcemap: true,
  outdir: outputDirectory,
  entryNames: 'app',
  assetNames: 'assets/[name]-[hash]',
  loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
  },
});

await context.watch();
const { host, port } = await context.serve({ servedir: outputDirectory, port: 4173 });
console.log(`Prism Bastion running at http://${host ?? 'localhost'}:${port}`);
