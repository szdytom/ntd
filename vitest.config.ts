import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const workspacePath = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const glslTextPlugin = {
  name: 'glsl-text',
  transform(source: string, id: string) {
    if (!id.split('?', 1)[0]?.endsWith('.glsl')) return null;
    return { code: `export default ${JSON.stringify(source)};`, map: null };
  },
};

export default defineConfig({
  plugins: [glslTextPlugin],
  resolve: {
    alias: [
      { find: /^@prism-bastion\/game-core\/(.+)$/, replacement: `${workspacePath('./packages/game-core/src')}/$1` },
      { find: '@prism-bastion/game-core', replacement: workspacePath('./packages/game-core/src/index.ts') },
      { find: /^@prism-bastion\/coop\/(.+)$/, replacement: `${workspacePath('./packages/coop/src')}/$1` },
      { find: '@prism-bastion/coop', replacement: workspacePath('./packages/coop/src/index.ts') },
      { find: /^@prism-bastion\/web-shared\/(.+)$/, replacement: `${workspacePath('./packages/web-shared/src')}/$1` },
      { find: '@prism-bastion/web-shared', replacement: workspacePath('./packages/web-shared/src/index.ts') },
      { find: /^@prism-bastion\/web-single\/(.+)$/, replacement: `${workspacePath('./apps/web-single/src')}/$1` },
      { find: '@prism-bastion/web-single', replacement: workspacePath('./apps/web-single/src/index.ts') },
    ],
  },
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
