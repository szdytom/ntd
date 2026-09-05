import * as esbuild from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const shared = {
  bundle: true, sourcemap: true, minify: true, target: ['node22'], platform: 'node', format: 'esm', legalComments: 'eof',
  banner: { js: 'import { createRequire as __prismCreateRequire } from "node:module"; const require = __prismCreateRequire(import.meta.url);' },
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning',
};
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const [server, worker] = await Promise.all([
  esbuild.build({ ...shared, entryPoints: ['src/index.ts'], outfile: 'dist/server.mjs', metafile: true }),
  esbuild.build({ ...shared, entryPoints: ['src/combat-worker.ts'], outfile: 'dist/combat-worker.mjs', metafile: true }),
]);
const inputs = [...Object.keys(server.metafile.inputs), ...Object.keys(worker.metafile.inputs)];
const forbiddenInputs = inputs.filter((path) => /packages[\\/]web-shared|apps[\\/]web-(?:single|coop)|\.(?:tsx|css)$/.test(path));
if (forbiddenInputs.length > 0) throw new Error(`Server bundle includes browser inputs:\n${forbiddenInputs.join('\n')}`);
const mainThreadSimulation = Object.keys(server.metafile.inputs).filter((path) => /game[\\/]engine\.ts$|packages[\\/]coop[\\/]src[\\/]simulation\.ts$/.test(path));
if (mainThreadSimulation.length > 0) throw new Error(`Server main thread includes combat simulation:\n${mainThreadSimulation.join('\n')}`);
const output = `${await readFile('dist/server.mjs', 'utf8')}\n${await readFile('dist/combat-worker.mjs', 'utf8')}`;
if (/react-i18next|ReactDOM|coop\.entryAction/.test(output)) throw new Error('Server bundle contains browser runtime content');
await writeFile('dist/meta.json', `${JSON.stringify({ server: server.metafile, worker: worker.metafile }, null, 2)}\n`);
console.log('Prism Bastion co-op server built in apps/coop-server/dist/');
