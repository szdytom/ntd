import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

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
    loader: { '.css': 'css' },
  }),
  copyFile('index.html', 'dist/index.html'),
]);

console.log('Prism Bastion built in dist/');
