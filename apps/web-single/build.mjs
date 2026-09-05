import * as esbuild from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { getBuildInfo } from '../../scripts/build-info.mjs';
import { localeFilterPlugin } from '../../build/locale-filter-plugin.mjs';

const buildInfo = getBuildInfo();
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const result = await esbuild.build({
  entryPoints: { app: 'src/main.tsx' }, bundle: true, minify: true, sourcemap: true, metafile: true,
  outdir: 'dist', entryNames: '[name]', assetNames: 'assets/[name]-[hash]', target: ['es2022'], legalComments: 'none',
  loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' }, plugins: [localeFilterPlugin],
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
  },
  logLevel: 'warning',
});
const forbiddenInputs = Object.keys(result.metafile.inputs).filter((path) => /packages[\\/]coop|apps[\\/]web-coop|apps[\\/]coop-server/.test(path));
if (forbiddenInputs.length > 0) throw new Error(`Single-player bundle includes co-op inputs:\n${forbiddenInputs.join('\n')}`);
const javascript = await readFile('dist/app.js', 'utf8');
if (javascript.includes('coop.')) throw new Error('Single-player bundle contains co-op locale content');
await Promise.all([
  copyFile('../../index.html', 'dist/index.html'),
  writeFile('dist/meta.json', `${JSON.stringify(result.metafile, null, 2)}\n`),
]);
console.log('Prism Bastion single-player client built in apps/web-single/dist/');
