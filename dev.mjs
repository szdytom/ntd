import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');

const context = await esbuild.context({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  sourcemap: true,
  outdir: 'dist',
  entryNames: 'app',
  assetNames: 'assets/[name]-[hash]',
  loader: { '.css': 'css', '.glsl': 'text' },
});

await context.watch();
const { host, port } = await context.serve({ servedir: 'dist', port: 4173 });
console.log(`Prism Bastion running at http://${host ?? 'localhost'}:${port}`);
