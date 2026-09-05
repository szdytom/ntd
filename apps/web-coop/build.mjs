import * as esbuild from 'esbuild';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { getBuildInfo } from '../../scripts/build-info.mjs';

const buildInfo = getBuildInfo();
const rawServers = process.env.COOP_PUBLIC_SERVERS;
const publicServers = rawServers ? JSON.parse(rawServers) : {};
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const result = await esbuild.build({
  entryPoints: { app: 'src/main.tsx' }, bundle: true, splitting: true, format: 'esm', platform: 'browser',
  minify: true, sourcemap: true, metafile: true, outdir: 'dist', entryNames: '[name]', chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]', target: ['es2022'], legalComments: 'none',
  loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
    __PRISM_BASTION_COOP_SERVERS__: JSON.stringify(publicServers),
    __PRISM_BASTION_COOP_ALLOW_SERVER_OVERRIDE__: 'false',
  },
  logLevel: 'warning',
});
const entryOutput = Object.values(result.metafile.outputs).find((output) => output.entryPoint?.endsWith('src/main.tsx'));
if (!entryOutput?.imports.some((entry) => entry.kind === 'dynamic-import')) {
  throw new Error('Full client must keep the co-op feature in a dynamic chunk');
}
const javascriptFiles = (await readdir('dist', { recursive: true }))
  .filter((path) => path.endsWith('.js'));
const javascript = (await Promise.all(javascriptFiles.map((path) => readFile(`dist/${path}`, 'utf8')))).join('\n');
if (!javascript.includes('coop.entryAction')) throw new Error('Full client unexpectedly filtered co-op locale content');
const redirect = (coop) => `<!doctype html><meta charset="utf-8"><script>const p=new URLSearchParams(location.search);${coop ? 'p.set("mode","coop")' : 'p.delete("mode")'};location.replace("./"+(p.size?"?"+p:"")+location.hash)</script>`;
await Promise.all([
  copyFile('../../index.html', 'dist/index.html'),
  writeFile('dist/coop.html', redirect(true)),
  writeFile('dist/single-player.html', redirect(false)),
  writeFile('dist/meta.json', `${JSON.stringify(result.metafile, null, 2)}\n`),
]);
console.log('Prism Bastion full client built in apps/web-coop/dist/');
