import * as esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const buildInfo = getBuildInfo();
const outputDirectory = 'apps/web-coop/dist';
await mkdir(outputDirectory, { recursive: true });
const redirect = (coop) => `<!doctype html><meta charset="utf-8"><script>const p=new URLSearchParams(location.search);${coop ? 'p.set("mode","coop")' : 'p.delete("mode")'};location.replace("./"+(p.size?"?"+p:"")+location.hash)</script>`;
await Promise.all([
  copyFile('index.html', `${outputDirectory}/index.html`),
  writeFile(`${outputDirectory}/coop.html`, redirect(true)),
  writeFile(`${outputDirectory}/single-player.html`, redirect(false)),
]);

const context = await esbuild.context({
  entryPoints: { app: 'apps/web-coop/src/main.tsx' },
  bundle: true,
  splitting: true,
  format: 'esm',
  sourcemap: true,
  outdir: outputDirectory,
  entryNames: '[name]',
  assetNames: 'assets/[name]-[hash]',
  loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
    __PRISM_BASTION_COOP_SERVERS__: '{}',
    __PRISM_BASTION_COOP_ALLOW_SERVER_OVERRIDE__: 'true',
  },
});

await context.watch();
const clientPort = Number.parseInt(process.env.COOP_CLIENT_PORT ?? '4173', 10);
const served = await context.serve({ servedir: outputDirectory, host: '0.0.0.0', port: clientPort });
const server = spawn(process.execPath, ['--import', 'tsx', 'apps/coop-server/src/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TSX_TSCONFIG_PATH: 'tsconfig.base.json',
    COOP_ALLOW_ANY_ORIGIN: process.env.COOP_ALLOW_ANY_ORIGIN ?? '1',
    COOP_DEV_LOG: process.env.COOP_DEV_LOG ?? '1',
  },
});

const close = async () => {
  server.kill('SIGTERM');
  await context.dispose();
  process.exit(0);
};
process.once('SIGINT', close);
process.once('SIGTERM', close);
server.once('exit', (code) => {
  if (code && code !== 0) {
    void context.dispose().finally(() => process.exit(code));
  }
});

console.log(`Prism Bastion co-op client running at http://${served.host ?? '0.0.0.0'}:${served.port}`);
