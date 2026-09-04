import * as esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { getBuildInfo } from './scripts/build-info.mjs';

const buildInfo = getBuildInfo();
await mkdir('dist-coop', { recursive: true });
await Promise.all([
  copyFile('coop.html', 'dist-coop/index.html'),
  copyFile('index.html', 'dist-coop/single-player.html'),
]);

const context = await esbuild.context({
  entryPoints: { coop: 'src/coop-main.tsx', app: 'src/main.tsx' },
  bundle: true,
  sourcemap: true,
  outdir: 'dist-coop',
  entryNames: '[name]',
  assetNames: 'assets/[name]-[hash]',
  loader: { '.module.css': 'local-css', '.css': 'css', '.glsl': 'text' },
  define: {
    __PRISM_BASTION_COMMIT_DATE__: JSON.stringify(buildInfo.commitDate),
    __PRISM_BASTION_COMMIT__: JSON.stringify(buildInfo.commit),
  },
});

await context.watch();
const clientPort = Number.parseInt(process.env.COOP_CLIENT_PORT ?? '4173', 10);
const served = await context.serve({ servedir: 'dist-coop', host: '0.0.0.0', port: clientPort });
const server = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, COOP_DEV_LOG: process.env.COOP_DEV_LOG ?? '1' },
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
